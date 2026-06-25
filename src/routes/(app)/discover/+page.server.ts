import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { regionMapCenter, resolveViewRegion } from '$lib/services/location.js';

export const load: PageServerLoad = async ({ locals }) => {
	// Auth guard handled by (app)/+layout.server.ts
	const service = new SupabasePromptQueryService(locals.supabase);

	// Guests are pinned to their corner's region; other members follow the
	// host they arrived on (dyad.amsterdam → Amsterdam), so a multi-region
	// member sees the region matching the domain. See migration 20260605100200.
	const region = resolveViewRegion({
		homeScope: locals.homeScope,
		homeRegion: locals.homeRegion,
		hostRegion: locals.hostRegion
	});

	const [prompts, corpus] = await Promise.all([
		service.getPublishedPrompts({
			region,
			userId: locals.user!.id,
			scopes: locals.scopes,
			homeScope: locals.homeScope
		}),
		service.getSearchCorpus(region, locals.scopes, locals.homeScope)
	]);

	// Enrich search corpus with username + soonest_slot from the already-fetched
	// prompts. Search must only surface conversations that are live on the
	// discover list — i.e. those with an available future slot. The corpus query
	// (getSearchCorpus) returns every published prompt, including archived ones
	// (no available slots); those have no entry in promptMeta and would render
	// with an empty date/author row. Restrict the corpus to the available set.
	const promptMeta = new Map(prompts.map(p => [p.id, { username: p.author_username, soonest_slot: p.soonest_slot ?? null }]));
	const searchCorpus = corpus
		.filter(c => promptMeta.has(c.id))
		.map(c => ({
			...c,
			username: promptMeta.get(c.id)!.username,
			soonest_slot: promptMeta.get(c.id)!.soonest_slot
		}));

	return {
		prompts,
		searchCorpus,
		mapCenter: regionMapCenter(region),
		isGuest: locals.homeScope !== null
	};
};
