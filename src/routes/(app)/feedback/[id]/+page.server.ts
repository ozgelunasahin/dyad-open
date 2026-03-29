import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import type { RevealedFeedback } from '$lib/domain/types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const service = new SupabaseFeedbackService(locals.supabase);

	const [form, vocabulary] = await Promise.all([
		service.getFormById(params.id, userId).catch(() => null),
		service.getVocabulary()
	]);

	if (!form) {
		redirect(302, '/discover');
	}

	// not_due → redirect to meeting detail (bookmarked URL guard)
	if (form.state === 'not_due') {
		redirect(302, `/meetings/${form.meeting_id}`);
	}

	// Load revealed feedback for locked/released forms
	let revealedFeedback: RevealedFeedback[] = [];
	if (form.state === 'locked' || form.state === 'released') {
		revealedFeedback = await service.getRevealedFeedback(form.meeting_id, userId);
	}

	// Load meeting context (other participant + meeting date)
	let meetingContext: { otherUsername: string; meetingDate: string } | null = null;
	if (form.meeting_id) {
		const { data: meeting } = await locals.supabase
			.from('meetings')
			.select('scheduled_time, participant_a, participant_b, prompt_id')
			.eq('id', form.meeting_id)
			.single();

		if (meeting) {
			const otherId = meeting.participant_a === userId ? meeting.participant_b : meeting.participant_a;
			const { data: otherProfile } = await locals.supabase.from('profiles').select('username').eq('id', otherId).single();
			meetingContext = {
				otherUsername: otherProfile?.username ?? 'someone',
				meetingDate: new Date(meeting.scheduled_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
			};
		}
	}

	return { form, vocabulary, meetingContext, revealedFeedback };
};
