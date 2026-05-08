import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ locals }) => {
	// Auth guard handled by (app)/+layout.server.ts
	const service = new SupabasePromptQueryService(locals.supabase);
	const [prompts, corpus] = await Promise.all([
		service.getPublishedPrompts({
			region: 'berlin',
			userId: locals.user!.id,
			scopes: locals.scopes
		}),
		service.getSearchCorpus('berlin', locals.scopes)
	]);

	// Enrich search corpus with username + soonest_slot from the already-fetched prompts
	const promptMeta = new Map(prompts.map(p => [p.id, { username: p.author_username, soonest_slot: p.soonest_slot ?? null }]));
	const searchCorpus = corpus.map(c => ({
		...c,
		username: promptMeta.get(c.id)?.username ?? '',
		soonest_slot: promptMeta.get(c.id)?.soonest_slot ?? null
	}));

	return { prompts, searchCorpus };
};
