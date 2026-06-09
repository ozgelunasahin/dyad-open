import { ISSUES } from '$lib/newsletter.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data } = await locals.supabase
		.from('newsletter_posts')
		.select('slug, title, published_at, teaser, cover_image_url, tags')
		.eq('published', true)
		.order('published_at', { ascending: false });

	if (data && data.length > 0) return { posts: data };

	// Fall back to static issues while DB migration is pending
	return {
		posts: ISSUES.map((i) => ({
			slug: i.slug,
			title: i.title,
			published_at: i.date,
			teaser: i.teaser,
			cover_image_url: i.coverImage ?? null,
			tags: i.tags ?? []
		}))
	};
};
