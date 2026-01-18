import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = 'static/uploads';
const MAX_SIZE = 5 * 1024 * 1024;

// Derive extension from MIME type (not user-provided filename)
const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png'
};

interface UploadSuccessResponse {
	url: string;
}

interface UploadErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' } satisfies UploadErrorResponse, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		return json({ error: 'No file provided' } satisfies UploadErrorResponse, { status: 400 });
	}

	const ext = MIME_TO_EXT[file.type];
	if (!ext) {
		return json({ error: 'Invalid file type' } satisfies UploadErrorResponse, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File too large (max 5MB)' } satisfies UploadErrorResponse, { status: 400 });
	}

	const filename = `${nanoid()}.${ext}`;

	try {
		if (!existsSync(UPLOAD_DIR)) {
			await mkdir(UPLOAD_DIR, { recursive: true });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(path.join(UPLOAD_DIR, filename), buffer);

		return json({ url: `/uploads/${filename}` } satisfies UploadSuccessResponse);
	} catch (err) {
		console.error('Failed to write uploaded file:', err);
		return json({ error: 'Failed to save file' } satisfies UploadErrorResponse, { status: 500 });
	}
};
