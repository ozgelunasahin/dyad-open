import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	if (locals.user) {
		redirect(302, '/discover');
	}

	setHeaders({ 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });

	const prompts = await new SupabasePromptQueryService(locals.supabase)
		.getPublishedPromptsPublic({ region: 'berlin', limit: 8 });

	// Anonymise author data for public landing page — real usernames must not reach the client
	const anonymisedPrompts = prompts.map(p => ({
		...p,
		author_username: '•'.repeat(p.author_username.length),
		author_id: ''
	}));

	return { prompts: anonymisedPrompts };
};
