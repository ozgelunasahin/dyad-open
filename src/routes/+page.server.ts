import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { regionMapCenter } from '$lib/services/location.js';
import type { PromptSummary } from '$lib/domain/types.js';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	if (locals.user) {
		redirect(302, '/discover');
	}

	setHeaders({ 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });

	const prompts = await new SupabasePromptQueryService(locals.supabase)
		.getPublishedPromptsPublic({ region: 'berlin', limit: 20 });

	// Anonymise author data — real usernames must not reach the public client.
	// Only conversations with a geo-located slot can show a pin on the map.
	const mapPrompts: PromptSummary[] = prompts
		.filter((p) => p.available_slots.some((s) => s.general_area_lat != null && s.general_area_lng != null))
		.map((p) => ({ ...p, author_username: '•'.repeat(p.author_username.length), author_id: '' }));

	return {
		mapPrompts,
		mapCenter: regionMapCenter('berlin')
	};
};
