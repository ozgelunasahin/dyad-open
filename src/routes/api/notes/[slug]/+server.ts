import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { JSONContent } from '@tiptap/core';

const MAX_CONTENT_SIZE = 1024 * 100; // 100KB limit

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
			const allowedImageAttrs = ['src', 'alt', 'title', 'width', 'height'];
			for (const key of Object.keys(attrs)) {
				if (!allowedImageAttrs.includes(key)) {
					return `Invalid image attribute: "${key}"`;
				}
			}
			// For Supabase Storage, images come from supabase URL
			// Skip strict local path validation
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

// Validate slug to prevent traversal
function isValidSlug(slug: string): boolean {
	return /^[a-z0-9-]+$/.test(slug) && !slug.includes('..');
}

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = params;
	const canvasId = url.searchParams.get('canvas_id');

	if (!canvasId) {
		return json({ error: 'canvas_id parameter is required' }, { status: 400 });
	}

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug' }, { status: 400 });
	}

	const { data: note, error } = await locals.supabase
		.from('notes')
		.select('title, content')
		.eq('canvas_id', canvasId)
		.eq('slug', slug)
		.single();

	if (error || !note) {
		return json({ error: 'Note not found' }, { status: 404 });
	}

	return json({ content: note.content, title: note.title });
};

export const PUT: RequestHandler = async ({ locals, params, request, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = params;
	const canvasId = url.searchParams.get('canvas_id');

	if (!canvasId) {
		return json({ error: 'canvas_id parameter is required' }, { status: 400 });
	}

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug' }, { status: 400 });
	}

	// Parse JSON body with error handling
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	// Validate body structure
	if (
		typeof body !== 'object' ||
		body === null ||
		!('content' in body) ||
		!('title' in body) ||
		typeof (body as { title: unknown }).title !== 'string' ||
		typeof (body as { content: unknown }).content !== 'object'
	) {
		return json(
			{ error: 'Request body must have "title" string and "content" object fields' },
			{ status: 400 }
		);
	}

	const { title, content } = body as { title: string; content: JSONContent };

	// Validate JSONContent structure to prevent XSS
	const contentError = validateJSONContent(content);
	if (contentError) {
		console.error(`[API] Content validation failed for ${slug}:`, contentError);
		return json({ error: `Invalid content: ${contentError}` }, { status: 400 });
	}

	// Check content size limit
	const contentSize = JSON.stringify(content).length;
	if (contentSize > MAX_CONTENT_SIZE) {
		return json({ error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes` }, { status: 413 });
	}

	const wikilinks = extractWikilinks(content);

	const { error } = await locals.supabase.from('notes').upsert(
		{
			canvas_id: canvasId,
			user_id: locals.user.id,
			slug,
			title,
			content,
			wikilinks,
			updated_at: new Date().toISOString()
		},
		{
			onConflict: 'canvas_id,slug'
		}
	);

	if (error) {
		console.error('Failed to save note:', error);
		return json({ error: 'Failed to save note' }, { status: 500 });
	}

	// Auto-update canvas cover image if this note is the entry point
	const { data: canvas } = await locals.supabase
		.from('canvases')
		.select('id, entry_point_note_id')
		.eq('id', canvasId)
		.single();

	if (canvas && canvas.entry_point_note_id === slug) {
		// Extract first image from content
		const findFirstImage = (node: JSONContent): string | null => {
			if (node.type === 'image' && node.attrs?.src) {
				return node.attrs.src;
			}
			if (node.content && Array.isArray(node.content)) {
				for (const child of node.content) {
					const imageUrl = findFirstImage(child);
					if (imageUrl) return imageUrl;
				}
			}
			return null;
		};

		const coverImageUrl = findFirstImage(content);

		// Update canvas cover_image
		await locals.supabase
			.from('canvases')
			.update({
				cover_image_url: coverImageUrl,
				updated_at: new Date().toISOString()
			})
			.eq('id', canvasId);

		console.log(`[API] Auto-updated cover image for canvas ${canvasId}: ${coverImageUrl}`);
	}

	return json({ success: true, saved: new Date().toISOString() });
};

export const DELETE: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { slug } = params;
	const canvasId = url.searchParams.get('canvas_id');

	if (!canvasId) {
		return json({ error: 'canvas_id parameter is required' }, { status: 400 });
	}

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug' }, { status: 400 });
	}

	const { error } = await locals.supabase
		.from('notes')
		.delete()
		.eq('canvas_id', canvasId)
		.eq('slug', slug);

	if (error) {
		console.error('Failed to delete note:', error);
		return json({ error: 'Failed to delete note' }, { status: 500 });
	}

	return json({ success: true });
};
