import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const userId = locals.user.id;

	const [profileResult, promptsResult, feedbackResult] = await Promise.all([
		locals.supabase
			.from('profiles')
			.select('username, can_publish_sites')
			.eq('id', userId)
			.single(),
		new SupabasePromptQueryService(locals.supabase).getPublishedPrompts({
			region: 'berlin',
			userId
		}),
		loadPendingFeedback(locals.supabase, userId)
	]);

	return {
		user: locals.user,
		username: profileResult.data?.username ?? '',
		canPublishSites: profileResult.data?.can_publish_sites ?? false,
		prompts: promptsResult,
		pendingFeedback: feedbackResult
	};
};

// Keep pending feedback loading — it's meeting-related, not canvas-related
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPendingFeedback(supabase: any, userId: string) {
	const [{ data: acceptedMeetings }, { data: submittedFeedback }] = await Promise.all([
		supabase
			.from('meeting_invitations')
			.select('id, inviter_id, invitee_id, proposed_time, updated_at')
			.eq('status', 'accepted')
			.or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`),
		supabase
			.from('meeting_feedback')
			.select('meeting_id')
			.eq('reviewer_id', userId)
	]);

	const reviewedMeetingIds = new Set(
		(submittedFeedback ?? []).map((f: { meeting_id: string }) => f.meeting_id)
	);

	// Build username map for meeting participants
	const participantIds = new Set<string>();
	for (const m of acceptedMeetings ?? []) {
		participantIds.add(m.inviter_id);
		participantIds.add(m.invitee_id);
	}
	const usernameMap = new Map<string, string>();
	if (participantIds.size > 0) {
		const { data: profiles } = await supabase
			.from('profiles')
			.select('id, username')
			.in('id', Array.from(participantIds));
		for (const p of profiles ?? []) usernameMap.set(p.id, p.username);
	}

	const now = Date.now();
	const pending: Array<{
		meetingId: string;
		otherUserId: string;
		otherUsername: string;
		proposedTime: string | null;
	}> = [];

	for (const meeting of acceptedMeetings ?? []) {
		if (reviewedMeetingIds.has(meeting.id)) continue;

		let meetingTimePassed = false;
		if (meeting.proposed_time) {
			try {
				const currentYear = new Date().getFullYear();
				const cleaned = meeting.proposed_time
					.replace(/^[A-Za-z]+,\s*/, '')
					.replace(' at ', ' ');
				const parsed = new Date(`${cleaned} ${currentYear}`);
				if (!isNaN(parsed.getTime())) {
					meetingTimePassed = parsed.getTime() + 2 * 60 * 60 * 1000 < now;
				}
			} catch {
				/* leave as false */
			}
		}

		if (!meetingTimePassed) continue;

		const otherUserId =
			meeting.inviter_id === userId ? meeting.invitee_id : meeting.inviter_id;
		pending.push({
			meetingId: meeting.id,
			otherUserId,
			otherUsername: usernameMap.get(otherUserId) ?? 'them',
			proposedTime: meeting.proposed_time ?? null
		});
	}

	return pending;
}
