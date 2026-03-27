import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const service = new SupabaseMeetingService(locals.supabase);

	const meeting = await service.getWithLocation(params.id)
		?? await service.getDetail(params.id);

	if (!meeting) {
		redirect(302, '/profile');
	}

	if (meeting.participant_a !== userId && meeting.participant_b !== userId) {
		redirect(302, '/profile');
	}

	const otherId = meeting.participant_a === userId
		? meeting.participant_b
		: meeting.participant_a;

	// Load other participant's username and the conversation context
	const [{ data: otherProfile }, { data: prompt }, { data: invitation }] = await Promise.all([
		locals.supabase.from('profiles').select('username').eq('id', otherId).single(),
		locals.supabase.from('prompts').select('id, title').eq('id', meeting.prompt_id).single(),
		locals.supabase
			.from('prompt_invitations')
			.select('message')
			.eq('prompt_id', meeting.prompt_id)
			.eq('state', 'accepted')
			.limit(1)
			.single()
			.then(r => r.data)
			.catch(() => null)
	]);

	return {
		meeting,
		otherUsername: otherProfile?.username ?? 'someone',
		promptId: prompt?.id ?? null,
		promptTitle: prompt?.title ?? null,
		invitationMessage: invitation?.message ?? null
	};
};
