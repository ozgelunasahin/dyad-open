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
	const { highlight_id, body: commentBody } = body;

	if (!highlight_id || !commentBody) {
		error(400, 'highlight_id and body are required');
	}

	if (typeof commentBody !== 'string' || commentBody.length < 1 || commentBody.length > 5000) {
		error(400, 'Comment body must be between 1 and 5000 characters');
	}

	const { data, error: dbError } = await locals.supabase
		.from('comments')
		.insert({
			highlight_id,
			user_id: locals.user.id,
			body: commentBody.trim()
		})
		.select('id, highlight_id, user_id, body, created_at')
		.single();

	if (dbError) {
		console.error('Failed to create comment:', dbError);
		error(500, 'Failed to create comment');
	}

	// Create notification for the canvas author
	// First, look up the highlight to find the canvas, then the canvas to find the author
	const { data: highlight } = await locals.supabase
		.from('highlights')
		.select('canvas_id')
		.eq('id', highlight_id)
		.single();

	if (highlight) {
		const { data: canvas } = await locals.supabase
			.from('canvases')
			.select('user_id, name')
			.eq('id', highlight.canvas_id)
			.single();

		if (canvas && canvas.user_id !== locals.user.id) {
			// Get commenter's username
			const { data: commenterProfile } = await locals.supabase
				.from('profiles')
				.select('username')
				.eq('id', locals.user.id)
				.single();

			await locals.supabase.from('notifications').insert({
				user_id: canvas.user_id,
				type: 'new_comment',
				data: {
					canvas_id: highlight.canvas_id,
					canvas_name: canvas.name,
					commenter_username: commenterProfile?.username ?? 'someone',
					comment_preview: commentBody.trim().slice(0, 100)
				}
			});
		}
	}

	return json(data, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const id = url.searchParams.get('id');
	if (!id) {
		error(400, 'id is required');
	}

	const { error: dbError } = await locals.supabase
		.from('comments')
		.delete()
		.eq('id', id)
		.eq('user_id', locals.user.id);

	if (dbError) {
		console.error('Failed to delete comment:', dbError);
		error(500, 'Failed to delete comment');
	}

	return json({ ok: true });
};
