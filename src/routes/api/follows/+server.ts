import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/follows — toggle follow/unfollow a user
// Body: { following_id: string }
// Returns: { following: boolean }
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const { following_id } = await request.json();
	if (!following_id || typeof following_id !== 'string') {
		error(400, 'following_id is required');
	}

	if (following_id === locals.user.id) {
		error(400, 'Cannot follow yourself');
	}

	// Check if already following
	const { data: existing } = await locals.supabase
		.from('follows')
		.select('id')
		.eq('follower_id', locals.user.id)
		.eq('following_id', following_id)
		.maybeSingle();

	if (existing) {
		// Unfollow
		await locals.supabase
			.from('follows')
			.delete()
			.eq('follower_id', locals.user.id)
			.eq('following_id', following_id);
		return json({ following: false });
	} else {
		// Follow
		await locals.supabase.from('follows').insert({
			follower_id: locals.user.id,
			following_id
		});
		return json({ following: true });
	}
};

// GET /api/follows?following_id=xxx — check if current user follows someone
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ following: false });
	}

	const followingId = url.searchParams.get('following_id');
	if (!followingId) {
		error(400, 'following_id is required');
	}

	const { data } = await locals.supabase
		.from('follows')
		.select('id')
		.eq('follower_id', locals.user.id)
		.eq('following_id', followingId)
		.maybeSingle();

	return json({ following: !!data });
};
