import { json } from '@sveltejs/kit';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RequestHandler } from './$types';
import type { JSONContent } from '@tiptap/core';

const VAULT_FILE = resolve('./static/vault/index.json');
const API_WRITE_MARKER = '.last-api-write';
const MAX_CONTENT_SIZE = 1024 * 100; // 100KB limit

// Response types for type safety
interface NoteGetResponse {
	content: JSONContent;
	title: string;
}

interface NotePutResponse {
	success: true;
	saved: string;
}

interface ApiErrorResponse {
	error: string;
}

// Type guard for PUT request body - now expects JSONContent
interface PutNoteBody {
	title: string;
	content: JSONContent;
}

function isValidPutBody(body: unknown): body is PutNoteBody {
	return (
		typeof body === 'object' &&
		body !== null &&
		'content' in body &&
		typeof (body as PutNoteBody).content === 'object' &&
		'title' in body &&
		typeof (body as PutNoteBody).title === 'string'
	);
}

// Whitelist of allowed ProseMirror node types to prevent injection attacks
const ALLOWED_NODE_TYPES = new Set([
	'doc',
	'paragraph',
	'heading',
	'text',
	'wikilink',
	'bulletList',
	'orderedList',
	'listItem',
	'blockquote',
	'codeBlock',
	'code',
	'hardBreak',
	'horizontalRule',
	'image'
]);

// Whitelist of allowed mark types
const ALLOWED_MARK_TYPES = new Set(['bold', 'italic', 'code', 'link', 'strike']);

/**
 * Validate JSONContent structure to prevent XSS via malicious node injection.
 * Returns null if valid, or an error message string if invalid.
 */
function validateJSONContent(node: unknown, depth = 0): string | null {
	// Prevent stack overflow from deeply nested content
	if (depth > 50) {
		return 'Content nesting too deep (max 50 levels)';
	}

	if (typeof node !== 'object' || node === null) {
		return 'Content must be an object';
	}

	const n = node as Record<string, unknown>;

	// Root must be type: 'doc'
	if (depth === 0 && n.type !== 'doc') {
		return 'Content must have type "doc" at root';
	}

	// Validate node type
	if (typeof n.type !== 'string') {
		return 'Node missing required "type" field';
	}
	if (!ALLOWED_NODE_TYPES.has(n.type)) {
		return `Invalid node type: "${n.type}"`;
	}

	// Validate marks if present
	if (n.marks !== undefined) {
		if (!Array.isArray(n.marks)) {
			return 'Node marks must be an array';
		}
		for (const mark of n.marks) {
			if (typeof mark !== 'object' || mark === null || typeof mark.type !== 'string') {
				return 'Invalid mark structure';
			}
			if (!ALLOWED_MARK_TYPES.has(mark.type)) {
				return `Invalid mark type: "${mark.type}"`;
			}
			// Link marks are allowed to have href attr
			if (mark.type === 'link' && mark.attrs) {
				const allowedLinkAttrs = ['href', 'target', 'rel', 'class'];
				for (const key of Object.keys(mark.attrs as object)) {
					if (!allowedLinkAttrs.includes(key)) {
						return `Invalid link mark attribute: "${key}"`;
					}
				}
			}
		}
	}

	// Validate attrs if present (only allow safe attribute names)
	if (n.attrs !== undefined) {
		if (typeof n.attrs !== 'object' || n.attrs === null) {
			return 'Node attrs must be an object';
		}

		const attrs = n.attrs as Record<string, unknown>;

		if (n.type === 'image') {
			// Allow only safe attributes for images
			const allowedImageAttrs = ['src', 'alt', 'title'];
			for (const key of Object.keys(attrs)) {
				if (!allowedImageAttrs.includes(key)) {
					return `Invalid image attribute: "${key}"`;
				}
			}
			// Validate src is a local upload path
			if (typeof attrs.src === 'string' && !attrs.src.startsWith('/uploads/')) {
				return 'Image src must be a local upload path';
			}
		} else {
			// Block dangerous attribute names on non-image nodes
			const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'href', 'src'];
			for (const key of Object.keys(attrs)) {
				if (dangerousAttrs.includes(key.toLowerCase())) {
					return `Forbidden attribute: "${key}"`;
				}
			}
		}
	}

	// Recursively validate children
	if (n.content !== undefined) {
		if (!Array.isArray(n.content)) {
			return 'Node content must be an array';
		}
		for (const child of n.content) {
			const childError = validateJSONContent(child, depth + 1);
			if (childError) return childError;
		}
	}

	return null; // Valid
}

interface Vault {
	entryPoint: string;
	notes: Record<
		string,
		{
			id: string;
			title: string;
			content: JSONContent;
			wikilinks: string[];
		}
	>;
}

async function loadVault(): Promise<Vault> {
	const raw = await readFile(VAULT_FILE, 'utf-8');
	return JSON.parse(raw) as Vault;
}

async function saveVault(vault: Vault): Promise<void> {
	await writeFile(VAULT_FILE, JSON.stringify(vault, null, 2) + '\n', 'utf-8');
}

/**
 * Extract wikilinks from JSON content.
 */
function extractWikilinks(content: JSONContent): string[] {
	const links: string[] = [];

	function walk(node: JSONContent) {
		if (node.type === 'wikilink' && node.attrs?.target) {
			links.push(node.attrs.target);
		}
		if (node.content) {
			for (const child of node.content) {
				walk(child);
			}
		}
	}

	walk(content);
	return [...new Set(links)];
}

// Touch marker file to signal vite plugin to skip hot reload
async function touchMarker(): Promise<void> {
	try {
		await writeFile(API_WRITE_MARKER, Date.now().toString(), 'utf-8');
	} catch {
		// Ignore errors - not critical
	}
}

// Validate slug to prevent traversal
function isValidSlug(slug: string): boolean {
	return /^[a-z0-9-]+$/.test(slug) && !slug.includes('..');
}

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	console.log('[API PUT] Request received for:', params.slug);

	if (!locals.user) {
		console.log('[API PUT] Unauthorized - no user');
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = params;

	if (!isValidSlug(slug)) {
		console.log('[API PUT] Invalid slug:', slug);
		return json({ error: 'Invalid slug' } satisfies ApiErrorResponse, { status: 400 });
	}

	// Parse JSON body with error handling
	let body: unknown;
	try {
		body = await request.json();
		console.log('[API PUT] Body parsed, content type:', typeof (body as Record<string, unknown>)?.content);
	} catch (e) {
		console.log('[API PUT] JSON parse error:', e);
		return json({ error: 'Invalid JSON body' } satisfies ApiErrorResponse, { status: 400 });
	}

	// Validate body structure
	if (!isValidPutBody(body)) {
		console.log('[API PUT] Invalid body structure:', Object.keys(body as object));
		return json(
			{ error: 'Request body must have "title" string and "content" object fields' } satisfies ApiErrorResponse,
			{ status: 400 }
		);
	}

	const { title, content } = body;

	// Validate JSONContent structure to prevent XSS
	const contentError = validateJSONContent(content);
	if (contentError) {
		console.error(`[API] Content validation failed for ${slug}:`, contentError);
		console.error(`[API] Content was:`, JSON.stringify(content).slice(0, 500));
		return json(
			{ error: `Invalid content: ${contentError}` } satisfies ApiErrorResponse,
			{ status: 400 }
		);
	}

	// Check content size limit (rough estimate)
	const contentSize = JSON.stringify(content).length;
	if (contentSize > MAX_CONTENT_SIZE) {
		return json(
			{ error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes` } satisfies ApiErrorResponse,
			{ status: 413 }
		);
	}

	try {
		// Load vault, update note, save vault
		await touchMarker();
		const vault = await loadVault();

		// Extract wikilinks from JSON content
		const wikilinks = extractWikilinks(content);

		// Update or create note
		vault.notes[slug] = {
			id: slug,
			title,
			content,
			wikilinks
		};

		await saveVault(vault);
		return json({ success: true, saved: new Date().toISOString() } satisfies NotePutResponse);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[API] Failed to save ${slug}:`, message);
		return json({ error: 'Failed to save note' } satisfies ApiErrorResponse, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = params;

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug' } satisfies ApiErrorResponse, { status: 400 });
	}

	try {
		const vault = await loadVault();
		const note = vault.notes[slug];

		if (!note) {
			return json({ error: 'Note not found' } satisfies ApiErrorResponse, { status: 404 });
		}

		return json({ content: note.content, title: note.title } satisfies NoteGetResponse);
	} catch {
		return json({ error: 'Failed to load vault' } satisfies ApiErrorResponse, { status: 500 });
	}
};
