import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { REGIONS, DEFAULT_REGION } from '$lib/services/location.js';

/** What a public card needs. No author data leaves the server. */
export interface UpcomingCard {
	id: string;
	title: string;
	area: string;
	when: string | null;
	cover: string | null;
	capacity: number | null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const requested = url.searchParams.get('city') ?? '';
	const city = requested in REGIONS ? requested : DEFAULT_REGION;

	const prompts = await new SupabasePromptQueryService(locals.supabase)
		.getPublishedPromptsPublic({ region: city, limit: 6 })
		.catch((err) => {
			console.error('about: upcoming conversations failed', err);
			return [];
		});

	const upcoming: UpcomingCard[] = prompts.map((p) => ({
		id: p.id,
		title: p.title ?? p.body_snippet,
		area: p.available_slots[0]?.general_area ?? '',
		when: p.soonest_slot,
		cover: p.cover_image_url,
		capacity: p.capacity
	}));

	return {
		city,
		cities: Object.entries(REGIONS).map(([key, r]) => ({ key, label: r.label })),
		upcoming
	};
};
