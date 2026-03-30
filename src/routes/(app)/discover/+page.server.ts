import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ locals }) => {
	// Auth guard handled by (app)/+layout.server.ts
	const service = new SupabasePromptQueryService(locals.supabase);
	const [prompts, searchCorpus] = await Promise.all([
		service.getPublishedPrompts({ region: 'berlin', userId: locals.user!.id }),
		service.getSearchCorpus('berlin')
	]);

	return { prompts, searchCorpus };
};
