import { json } from '@sveltejs/kit';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RequestHandler } from './$types';

const NOTES_DIR = resolve('./content/notes');
const API_WRITE_MARKER = '.last-api-write';
const MAX_CONTENT_SIZE = 1024 * 100; // 100KB limit

// Response types for type safety
interface NoteGetResponse {
	content: string;
}

interface NotePutResponse {
	success: true;
	saved: string;
}

interface ApiErrorResponse {
	error: string;
}

// Type guard for PUT request body
interface PutNoteBody {
	content: string;
}

function isValidPutBody(body: unknown): body is PutNoteBody {
	return (
		typeof body === 'object' &&
		body !== null &&
		'content' in body &&
		typeof (body as PutNoteBody).content === 'string'
	);
}

// Touch marker file to signal vite plugin to skip hot reload
async function touchMarker(): Promise<void> {
	try {
		await writeFile(API_WRITE_MARKER, Date.now().toString(), 'utf-8');
	} catch {
		// Ignore errors - not critical
	}
}

// Validate slug to prevent path traversal
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

	// Verify resolved path is within NOTES_DIR (defense in depth for path traversal)
	const filePath = resolve(NOTES_DIR, `${slug}.md`);
	if (!filePath.startsWith(NOTES_DIR)) {
		return json({ error: 'Invalid path' } satisfies ApiErrorResponse, { status: 400 });
	}

	// Parse JSON body with error handling (P1-005 fix)
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' } satisfies ApiErrorResponse, { status: 400 });
	}

	// Validate body structure
	if (!isValidPutBody(body)) {
		return json({ error: 'Request body must have a "content" string field' } satisfies ApiErrorResponse, { status: 400 });
	}

	const { content } = body;

	// Check content size limit
	if (content.length > MAX_CONTENT_SIZE) {
		return json({ error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes` } satisfies ApiErrorResponse, { status: 413 });
	}

	try {
		// Touch marker BEFORE writing to ensure vite plugin sees it
		await touchMarker();
		await writeFile(filePath, content, 'utf-8');
		return json({ success: true, saved: new Date().toISOString() } satisfies NotePutResponse);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[API] Failed to save ${slug}:`, message);
		return json({ error: 'Failed to save file' } satisfies ApiErrorResponse, { status: 500 });
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

	// Verify resolved path is within NOTES_DIR (defense in depth)
	const filePath = resolve(NOTES_DIR, `${slug}.md`);
	if (!filePath.startsWith(NOTES_DIR)) {
		return json({ error: 'Invalid path' } satisfies ApiErrorResponse, { status: 400 });
	}

	try {
		const content = await readFile(filePath, 'utf-8');
		return json({ content } satisfies NoteGetResponse);
	} catch {
		return json({ error: 'File not found' } satisfies ApiErrorResponse, { status: 404 });
	}
};
