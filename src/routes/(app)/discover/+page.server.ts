import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ locals }) => {
	// Auth guard handled by (app)/+layout.server.ts
	const prompts = await new SupabasePromptQueryService(locals.supabase)
		.getPublishedPrompts({
			region: 'berlin',
			userId: locals.user!.id
		});

	return { prompts };
};
