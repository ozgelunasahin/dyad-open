import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { canvas_id, body: text } = body;

	if (!canvas_id || typeof text !== 'string' || !text.trim()) {
		error(400, 'canvas_id and body are required');
	}

	const { data: comment, error: dbError } = await locals.supabase
		.from('canvas_comments')
		.insert({ canvas_id, user_id: locals.user.id, body: (text as string).trim() })
		.select()
		.single();

	if (dbError) {
		console.error('Failed to save canvas comment:', dbError);
		error(500, 'Failed to save comment');
	}

	// Fetch username so client can display immediately
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	return json({ ...comment, username: profile?.username ?? 'you' }, { status: 201 });
};
