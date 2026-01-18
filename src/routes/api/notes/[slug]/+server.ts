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
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = params;

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug' } satisfies ApiErrorResponse, { status: 400 });
	}

	// Parse JSON body with error handling
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' } satisfies ApiErrorResponse, { status: 400 });
	}

	// Validate body structure
	if (!isValidPutBody(body)) {
		return json(
			{ error: 'Request body must have "title" string and "content" object fields' } satisfies ApiErrorResponse,
			{ status: 400 }
		);
	}

	const { title, content } = body;

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
