import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { DEFAULT_REGION, regionMapCenter } from '$lib/services/location.js';

export const load: PageServerLoad = async ({ locals }) => {
	// Auth guard handled by (app)/+layout.server.ts
	const service = new SupabasePromptQueryService(locals.supabase);

	// Corner-exclusive members (guests) see their corner's region; everyone
	// else sees the commons default. See migration 20260605100200.
	const region = locals.homeScope ? (locals.homeRegion ?? DEFAULT_REGION) : DEFAULT_REGION;

	const [prompts, corpus] = await Promise.all([
		service.getPublishedPrompts({
			region,
			userId: locals.user!.id,
			scopes: locals.scopes,
			homeScope: locals.homeScope
		}),
		service.getSearchCorpus(region, locals.scopes, locals.homeScope)
	]);

	// Enrich search corpus with username + soonest_slot from the already-fetched prompts
	const promptMeta = new Map(prompts.map(p => [p.id, { username: p.author_username, soonest_slot: p.soonest_slot ?? null }]));
	const searchCorpus = corpus.map(c => ({
		...c,
		username: promptMeta.get(c.id)?.username ?? '',
		soonest_slot: promptMeta.get(c.id)?.soonest_slot ?? null
	}));

	return {
		prompts,
		searchCorpus,
		mapCenter: regionMapCenter(region),
		isGuest: locals.homeScope !== null
	};
};
