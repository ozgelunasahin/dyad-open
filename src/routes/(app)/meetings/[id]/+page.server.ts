import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const service = new SupabaseMeetingService(locals.supabase);

	// Try full detail (with location) first, fall back to metadata-only
	const meeting = await service.getWithLocation(params.id)
		?? await service.getDetail(params.id);

	if (!meeting) {
		redirect(302, '/profile');
	}

	// Verify current user is a participant (defense-in-depth)
	if (meeting.participant_a !== userId && meeting.participant_b !== userId) {
		redirect(302, '/profile');
	}

	const otherParticipant = meeting.participant_a === userId
		? meeting.participant_b
		: meeting.participant_a;

	return { meeting, otherParticipant };
};
