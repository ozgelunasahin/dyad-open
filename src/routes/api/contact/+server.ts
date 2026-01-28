import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const { email, name } = body;

	if (!email || typeof email !== 'string') {
		error(400, 'Email is required');
	}

	// Basic email validation
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		error(400, 'Invalid email address');
	}

	const { error: dbError } = await locals.supabase
		.from('contacts')
		.insert({ email: email.trim(), name: name?.trim() || null });

	if (dbError) {
		console.error('Failed to save contact:', dbError);
		error(500, 'Failed to save contact');
	}

	return json({ ok: true });
};
