import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabaseMeetingService } from '$lib/services/meeting.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import type { RevealedFeedback, FeedbackForm } from '$lib/domain/types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const meetingService = new SupabaseMeetingService(locals.supabase);

	const meeting = await meetingService.getWithLocation(params.id)
		?? await meetingService.getDetail(params.id);

	if (!meeting) {
		redirect(302, '/profile');
	}

	if (meeting.participant_a !== userId && meeting.participant_b !== userId) {
		redirect(302, '/profile');
	}

	const otherId = meeting.participant_a === userId
		? meeting.participant_b
		: meeting.participant_a;

	const feedbackService = new SupabaseFeedbackService(locals.supabase);

	// Fan out all secondary queries in parallel
	const [{ data: otherProfile }, { data: prompt }, invitation, revealedFeedback, myFeedbackForm] = await Promise.all([
		locals.supabase.from('profiles').select('username').eq('id', otherId).single(),
		locals.supabase.from('prompts').select('id, title, cover_image_url, state, author_id, published_at').eq('id', meeting.prompt_id).single(),
		locals.supabase
			.from('prompt_invitations')
			.select('message')
			.eq('prompt_id', meeting.prompt_id)
			.eq('state', 'accepted')
			.limit(1)
			.maybeSingle()
			.then(r => r.data ?? null),
		// Load revealed feedback for completed meetings
		meeting.state === 'completed'
			? feedbackService.getRevealedFeedback(params.id, userId)
			: [] as RevealedFeedback[],
		// Load own feedback form state for awaiting_feedback meetings
		(meeting.state === 'awaiting_feedback' || meeting.state === 'completed')
			? feedbackService.getMyForm(params.id, userId)
			: null as FeedbackForm | null
	]);

	return {
		meeting,
		otherUsername: otherProfile?.username ?? 'someone',
		prompt: prompt ? {
			id: prompt.id,
			title: prompt.title,
			cover_image_url: prompt.cover_image_url,
			state: prompt.state,
			published_at: prompt.published_at
		} : null,
		invitationMessage: invitation?.message ?? null,
		revealedFeedback,
		myFeedbackForm: myFeedbackForm ? { id: myFeedbackForm.id, state: myFeedbackForm.state } : null
	};
};
