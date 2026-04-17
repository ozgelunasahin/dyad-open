import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseStorageService } from '$lib/services/storage.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return json({ error: 'Invalid file type' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File too large (max 5MB)' }, { status: 400 });
	}

	const ext = file.type.split('/')[1];
	const path = `${user.id}/${nanoid()}.${ext}`;

	const storage = new SupabaseStorageService(locals.supabase);
	try {
		const { url } = await storage.upload('uploads', path, file);
		return json({ url });
	} catch (err) {
		return handleServiceError(err, '[upload]');
	}
};
