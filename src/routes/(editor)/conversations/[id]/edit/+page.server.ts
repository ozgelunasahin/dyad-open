import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import type { Prompt } from '$lib/domain/types.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);
	const userId = upactor.id;

	// Virtual path: /conversations/new/edit renders the editor with an
	// in-memory blank prompt. No DB row is created until the user saves
	// something. Keeps the drafts table clean of blank rows from users
	// who clicked "+" and bailed without typing.
	if (params.id === 'new') {
		const now = new Date().toISOString();
		const blank: Prompt = {
			id: 'new',
			author_id: userId,
			title: null,
			body: null,
			cover_image_url: null,
			state: 'draft',
			region: 'berlin',
			published_at: null,
			archived_at: null,
			hidden_at: null,
			created_at: now,
			updated_at: now
		};
		return { prompt: blank, slots: [] };
	}

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
