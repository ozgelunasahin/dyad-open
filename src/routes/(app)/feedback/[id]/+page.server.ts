import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const service = new SupabaseFeedbackService(locals.supabase);

	const [form, vocabulary] = await Promise.all([
		service.getFormById(params.id, locals.user!.id).catch(() => null),
		service.getVocabulary()
	]);

	if (!form) {
		redirect(302, '/discover');
	}

	// Load meeting context (other participant + conversation title)
	let meetingContext: { otherUsername: string; promptTitle: string; meetingDate: string } | null = null;
	if (form.meeting_id) {
		const { data: meeting } = await locals.supabase
			.from('meetings')
			.select('scheduled_time, participant_a, participant_b, prompt_id')
			.eq('id', form.meeting_id)
			.single();

		if (meeting) {
			const otherId = meeting.participant_a === locals.user!.id ? meeting.participant_b : meeting.participant_a;
			const [{ data: otherProfile }, { data: prompt }] = await Promise.all([
				locals.supabase.from('profiles').select('username').eq('id', otherId).single(),
				locals.supabase.from('prompts').select('title').eq('id', meeting.prompt_id).single()
			]);
			meetingContext = {
				otherUsername: otherProfile?.username ?? 'someone',
				promptTitle: prompt?.title ?? 'a conversation',
				meetingDate: new Date(meeting.scheduled_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
			};
		}
	}

	return { form, vocabulary, meetingContext };
};
