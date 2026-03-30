import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { username } = params;

	// Look up the user by username
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, username, display_name')
		.eq('username', username)
		.maybeSingle();

	if (!profile) {
		error(404, 'User not found');
	}

	// Load their published conversations
	const { data: prompts } = await locals.supabase
		.from('prompts')
		.select('id, title, cover_image_url, published_at')
		.eq('author_id', profile.id)
		.eq('state', 'published')
		.order('published_at', { ascending: false });

	return {
		profile: {
			username: profile.username,
			display_name: profile.display_name ?? null
		},
		prompts: (prompts ?? []) as Array<{
			id: string;
			title: string | null;
			cover_image_url: string | null;
			published_at: string;
		}>
	};
};
