import { redirect } from '@sveltejs/kit';
import { userToUpactor } from '@prefig/upact-supabase';

/**
 * Shared layout data loader for authenticated route groups.
 * Used by both (app) and (editor) layouts.
 */
export async function loadLayoutData(locals: App.Locals) {
	if (!locals.user) {
		redirect(302, '/');
	}

	const pendingFormId = (locals as any).pendingFeedbackFormId as string | undefined;

	const [{ data: profile }, { count: invitationCount }, { count: feedbackCount }, pendingFeedback] = await Promise.all([
		locals.supabase
			.from('profiles')
			.select('username')
			.eq('id', locals.user.id)
			.single(),
		locals.supabase
			.from('prompt_invitations')
			.select('*', { count: 'exact', head: true })
			.eq('invitee_id', locals.user.id)
			.eq('state', 'pending'),
		locals.supabase
			.from('feedback_forms')
			.select('*', { count: 'exact', head: true })
			.eq('reviewer_id', locals.user.id)
			.eq('state', 'due'),
		pendingFormId ? loadPendingFeedback(locals, pendingFormId) : Promise.resolve(null)
	]);

	return {
		identity: userToUpactor(locals.user),
		username: profile?.username ?? '',
		attentionCount: (invitationCount ?? 0) + (feedbackCount ?? 0),
		isAdmin: locals.isAdmin, // out-of-port admin channel, set in hooks.server.ts
		pendingFeedback
	};
}

async function loadPendingFeedback(locals: App.Locals, formId: string) {
	const userId = locals.user!.id;

	const [{ data: form }, { data: vocabRows }, meetingContext] = await Promise.all([
		locals.supabase
			.from('feedback_forms')
			.select('id, meeting_id, state')
			.eq('id', formId)
			.eq('reviewer_id', userId)
			.single(),
		locals.supabase
			.from('adjective_vocabulary')
			.select('word')
			.eq('active', true)
			.order('word'),
		loadMeetingContext(locals, formId, userId)
	]);

	if (!form) return null;

	return {
		formId: form.id,
		meetingId: form.meeting_id as string,
		state: form.state as string,
		vocabulary: (vocabRows ?? []).map((r: { word: string }) => r.word),
		meetingContext
	};
}

async function loadMeetingContext(locals: App.Locals, formId: string, userId: string) {
	const { data: form } = await locals.supabase
		.from('feedback_forms')
		.select('meeting_id')
		.eq('id', formId)
		.single();

	if (!form?.meeting_id) return null;

	const { data: meeting } = await locals.supabase
		.from('meetings')
		.select('scheduled_time, participant_a, participant_b')
		.eq('id', form.meeting_id)
		.single();

	if (!meeting) return null;

	const otherId = meeting.participant_a === userId ? meeting.participant_b : meeting.participant_a;
	const { data: otherProfile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', otherId)
		.single();

	return {
		otherUsername: otherProfile?.username ?? 'someone',
		meetingDate: new Date(meeting.scheduled_time).toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric'
		})
	};
}
