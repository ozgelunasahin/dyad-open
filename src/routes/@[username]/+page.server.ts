import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, username, created_at')
		.eq('username', params.username)
		.single();

	if (!profile) {
		error(404, 'User not found');
	}

	// Load their published conversations
	const { data: conversations } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, cover_image_url, updated_at')
		.eq('user_id', profile.id)
		.eq('is_conversation', true)
		.eq('is_published', true)
		.neq('is_archived', true)
		.order('updated_at', { ascending: false });

	// Follower / following counts + current user's follow state
	let followerCount = 0;
	let followingCount = 0;
	let isFollowing = false;
	const currentUserId = locals.user?.id ?? null;

	try {
		const [followersResult, followingResult] = await Promise.all([
			locals.supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
			locals.supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id)
		]);
		followerCount = followersResult.count ?? 0;
		followingCount = followingResult.count ?? 0;

		if (currentUserId && currentUserId !== profile.id) {
			const { data: followRow } = await locals.supabase
				.from('follows')
				.select('id')
				.eq('follower_id', currentUserId)
				.eq('following_id', profile.id)
				.maybeSingle();
			isFollowing = !!followRow;
		}
	} catch {
		// follows table may not exist yet
	}

	return {
		profile: {
			id: profile.id,
			username: profile.username,
			joinedAt: profile.created_at
		},
		conversations: (conversations ?? []).map((c) => ({
			id: c.id,
			name: c.name,
			slug: c.slug,
			coverImageUrl: c.cover_image_url ?? null,
			updatedAt: c.updated_at
		})),
		followerCount,
		followingCount,
		isFollowing,
		currentUserId,
		isOwn: currentUserId === profile.id
	};
};
