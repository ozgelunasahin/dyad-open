import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import type { Prompt } from '$lib/domain/types.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseScopeService } from '$lib/services/scope.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);
	const userId = upactor.id;

	// Virtual path: /conversations/new/edit renders the editor with an
	// in-memory blank prompt. No DB row is created until the user saves
	// something. Keeps the drafts table clean of blank rows from users
	// who clicked "+" and bailed without typing.
	const scopeService = new SupabaseScopeService(locals.supabase);
	const myScopes = await scopeService.listMyScopes(userId);

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
			hidden_at: null,
			audience_scope: null,
			created_at: now,
			updated_at: now
		};
		return { prompt: blank, slots: [], myScopes };
	}

	const service = new SupabasePromptQueryService(locals.supabase);

	// Use getMyPrompts to ensure we only load the author's own prompts
	const myPrompts = await service.getMyPrompts(userId);
	const prompt = myPrompts.find((p) => p.id === params.id);

	if (!prompt) {
		redirect(302, '/discover');
	}

	// The editor only edits drafts. To revise a published conversation, the
	// author must Unpublish first (which transitions it to draft and lands them
	// here). Redirecting prevents an inconsistent edit-in-place flow on a live
	// prompt. Same posture for archived: those go through Republish, not direct
	// editing in this surface.
	if (prompt.state === 'published') {
		redirect(302, `/conversations/${params.id}`);
	}

	// Author-only access path with full LocationRef. The SECURITY DEFINER RPC
	// (migration 20260506220000) returns the prompt's slots only when the
	// caller is the author; non-authors get an empty set. This bypasses the
	// time_slots_public view's exact_location mask without weakening the
	// privacy contract for the discover/non-author paths.
	const { data: slotRows, error: slotError } = await locals.supabase.rpc('get_my_prompt_slots', {
		p_prompt_id: params.id
	});
	if (slotError) {
		// Surface RPC failure rather than silently treating it as "no slots."
		// A silent empty list would let the author republish over their existing
		// slots without warning.
		console.error('[editor/load] get_my_prompt_slots failed:', slotError);
		throw slotError;
	}

	const slots = ((slotRows as Array<{
		id: string;
		start_time: string;
		duration_minutes: number;
		general_area: string;
		general_area_lat: number | null;
		general_area_lng: number | null;
		exact_location: { place_id: string; name: string; address: string; lat: number; lng: number } | null;
		accepted: boolean;
		created_at: string;
	}> | null) ?? []).map((s) => ({
		id: s.id,
		prompt_id: params.id,
		start_time: s.start_time,
		duration_minutes: s.duration_minutes,
		general_area: s.general_area,
		// Preserve null centroids — MapView's null guard treats them correctly;
		// coercing to 0 silently plants the slot at (0,0) in the Atlantic.
		general_area_lat: s.general_area_lat,
		general_area_lng: s.general_area_lng,
		accepted: s.accepted,
		created_at: s.created_at,
		exact_location: s.exact_location ?? null
	}));

	return { prompt, slots, myScopes };
};
