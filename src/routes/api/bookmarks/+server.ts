import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/bookmarks — toggle bookmark/unbookmark a canvas
// Body: { canvas_id: string }
// Returns: { bookmarked: boolean }
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const { canvas_id } = await request.json();
	if (!canvas_id || typeof canvas_id !== 'string') {
		error(400, 'canvas_id is required');
	}

	// Check if already bookmarked
	const { data: existing } = await locals.supabase
		.from('bookmarks')
		.select('id')
		.eq('user_id', locals.user.id)
		.eq('canvas_id', canvas_id)
		.maybeSingle();

	if (existing) {
		await locals.supabase
			.from('bookmarks')
			.delete()
			.eq('user_id', locals.user.id)
			.eq('canvas_id', canvas_id);
		return json({ bookmarked: false });
	} else {
		await locals.supabase.from('bookmarks').insert({
			user_id: locals.user.id,
			canvas_id
		});
		return json({ bookmarked: true });
	}
};
