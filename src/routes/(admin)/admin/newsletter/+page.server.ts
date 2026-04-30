import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data } = await locals.supabase
		.from('newsletter_posts')
		.select('id, slug, title, published_at, published')
		.order('published_at', { ascending: false });

	return { posts: data ?? [] };
};
