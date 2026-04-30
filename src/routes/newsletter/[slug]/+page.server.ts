import { error } from '@sveltejs/kit';
import { renderTiptapToHtml } from '$lib/utils/tiptap-html.js';
import { getIssue, renderStaticBodyToHtml } from '$lib/newsletter.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const isAdmin = locals.user?.app_metadata?.role === 'admin';

	const { data } = await locals.supabase
		.from('newsletter_posts')
		.select('*')
		.eq('slug', params.slug)
		.eq('published', true)
		.single();

	if (data) {
		return { post: { ...data, bodyHtml: renderTiptapToHtml(data.body) }, isAdmin, postId: data.id };
	}

	// Fall back to static issue while DB migration is pending
	const issue = getIssue(params.slug);
	if (!issue) error(404, 'Post not found');

	return {
		post: {
			slug: issue.slug,
			title: issue.title,
			subtitle: issue.subtitle ?? null,
			author: issue.author ?? null,
			published_at: issue.date,
			teaser: issue.teaser,
			cover_image_url: issue.coverImage ?? null,
			tags: issue.tags ?? [],
			published: true,
			bodyHtml: renderStaticBodyToHtml(issue.body)
		},
		isAdmin,
		postId: null
	};
};
