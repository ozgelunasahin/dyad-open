import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

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
	const filename = `${locals.user.id}/${nanoid()}.${ext}`;

	const { error } = await locals.supabase.storage.from('uploads').upload(filename, file, {
		cacheControl: '31536000', // 1 year cache
		upsert: false
	});

	if (error) {
		console.error('Upload failed:', error);
		return json({ error: 'Failed to upload file' }, { status: 500 });
	}

	const {
		data: { publicUrl }
	} = locals.supabase.storage.from('uploads').getPublicUrl(filename);

	return json({ url: publicUrl });
};
