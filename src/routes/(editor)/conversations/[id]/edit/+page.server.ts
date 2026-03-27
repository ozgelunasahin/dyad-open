import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const service = new SupabasePromptQueryService(locals.supabase);

	// Use getMyPrompts to ensure we only load the author's own prompts
	const myPrompts = await service.getMyPrompts(userId);
	const prompt = myPrompts.find((p) => p.id === params.id);

	if (!prompt) {
		redirect(302, '/discover');
	}

	// Load existing slots if published
	let slots: Array<{
		id: string;
		start_time: string;
		duration_minutes: number;
		general_area: string;
	}> = [];

	if (prompt.state === 'published') {
		const availableSlots = await service.getAvailableSlots(params.id, userId);
		slots = availableSlots.map((s) => ({
			id: s.id,
			start_time: s.start_time,
			duration_minutes: s.duration_minutes,
			general_area: s.general_area
		}));
	}

	return { prompt, slots };
};
