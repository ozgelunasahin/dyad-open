import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { ISSUES } from '$lib/newsletter.js';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	if (locals.user) {
		redirect(302, '/discover');
	}

	setHeaders({ 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });

	const [prompts, dbPosts] = await Promise.all([
		new SupabasePromptQueryService(locals.supabase)
			.getPublishedPromptsPublic({ region: 'berlin', limit: 12 }),
		locals.supabase
			.from('newsletter_posts')
			.select('slug, title, published_at, teaser, cover_image_url, tags')
			.eq('published', true)
			.order('published_at', { ascending: false })
			.limit(3)
			.then(r => r.data)
	]);

	const anonymisedPrompts = prompts.map(p => ({
		...p,
		author_username: '',
		author_id: ''
	}));

	const fieldNotes = (dbPosts && dbPosts.length > 0)
		? dbPosts
		: ISSUES.slice(0, 3).map(i => ({
			slug: i.slug,
			title: i.title,
			published_at: i.date,
			teaser: i.teaser,
			cover_image_url: i.coverImage ?? null,
			tags: i.tags ?? []
		}));

	return { prompts: anonymisedPrompts, fieldNotes };
};
