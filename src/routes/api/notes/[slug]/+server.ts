import { json } from '@sveltejs/kit';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RequestHandler } from './$types';

const NOTES_DIR = './content/notes';
const API_WRITE_MARKER = '.last-api-write';

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

export const PUT: RequestHandler = async ({ params, request }) => {
	const { slug } = params;

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug' }, { status: 400 });
	}

	const { content } = await request.json();

	if (typeof content !== 'string') {
		return json({ error: 'Content must be a string' }, { status: 400 });
	}

	const filePath = join(NOTES_DIR, `${slug}.md`);

	try {
		// Touch marker BEFORE writing to ensure vite plugin sees it
		await touchMarker();
		await writeFile(filePath, content, 'utf-8');
		return json({ success: true, saved: new Date().toISOString() });
	} catch (error) {
		console.error(`[API] Failed to save ${slug}:`, error);
		return json({ error: 'Failed to save file' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ params }) => {
	const { slug } = params;

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug' }, { status: 400 });
	}

	const filePath = join(NOTES_DIR, `${slug}.md`);

	try {
		const content = await readFile(filePath, 'utf-8');
		return json({ content });
	} catch {
		return json({ error: 'File not found' }, { status: 404 });
	}
};
