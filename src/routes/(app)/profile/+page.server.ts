import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';
import { buildUsernameMap } from '$lib/server/username-lookup.js';

function getPartnerId(m: { participant_a: string; participant_b: string }, userId: string): string {
	return m.participant_a === userId ? m.participant_b : m.participant_a;
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [prompts, meetings, receivedInvitations, respondedPrompts, feedbackDue, cancelledNotifications] = await Promise.all([
		new SupabasePromptQueryService(locals.supabase).getMyPrompts(userId),
		new SupabaseMeetingService(locals.supabase).getMyMeetings(userId),

		// Invitations I received (as prompt author) — pending only
		locals.supabase
			.from('prompt_invitations')
			.select(`
				id, inviter_id, prompt_id, message, state, created_at,
				slot:slot_id(start_time, duration_minutes, general_area),
				prompt:prompt_id(title)
			`)
			.eq('invitee_id', userId)
			.eq('state', 'pending')
			.order('created_at', { ascending: true })
			.then(async ({ data }) => {
				if (!data || data.length === 0) return [];
				const inviterIds = data.map((inv: { inviter_id: string }) => inv.inviter_id);
				const usernameMap = await buildUsernameMap(locals.supabase, inviterIds);
				return data.map((inv: any) => ({
					id: inv.id,
					prompt_id: inv.prompt_id,
					prompt_title: inv.prompt?.title ?? 'Untitled',
					inviter_username: usernameMap.get(inv.inviter_id) ?? 'anonymous',
					message: inv.message,
					slot_start_time: inv.slot?.start_time,
					slot_duration_minutes: inv.slot?.duration_minutes,
					slot_general_area: inv.slot?.general_area,
					created_at: inv.created_at
				}));
			}),

		// Prompts I responded to (with author username)
		locals.supabase
			.from('prompt_comments')
			.select('prompt_id, body, created_at, prompts:prompt_id(title, state, author_id, cover_image_url)')
			.eq('author_id', userId)
			.order('created_at', { ascending: false })
			.then(async ({ data }) => {
				if (!data || data.length === 0) return [];
				const authorIds = data.map((c: any) => c.prompts?.author_id).filter(Boolean);
				const usernameMap = await buildUsernameMap(locals.supabase, authorIds);
				return data.map((c: any) => ({
					prompt_id: c.prompt_id,
					prompt_title: c.prompts?.title ?? 'Untitled',
					prompt_state: c.prompts?.state,
					prompt_cover_image_url: c.prompts?.cover_image_url ?? null,
					author_username: usernameMap.get(c.prompts?.author_id) ?? 'anonymous',
					response_body: c.body,
					created_at: c.created_at
				}));
			}),

		// Feedback forms due
		locals.supabase
			.from('feedback_forms')
			.select('id, meeting_id, state')
			.eq('reviewer_id', userId)
			.eq('state', 'due')
			.then(({ data }) => data ?? []),

		// Cancelled meeting notifications (unread)
		locals.supabase
			.from('notifications')
			.select('id, data, created_at')
			.eq('user_id', userId)
			.eq('type', 'meeting_cancelled')
			.eq('read', false)
			.order('created_at', { ascending: false })
			.then(async ({ data }) => {
				if (!data || data.length === 0) return [];
				const cancellerIds = data.map((n: any) => n.data?.cancelled_by).filter(Boolean);
				const usernameMap = await buildUsernameMap(locals.supabase, cancellerIds);
				return data.map((n: any) => ({
					id: n.id,
					cancelled_by_username: usernameMap.get(n.data?.cancelled_by) ?? 'someone',
					scheduled_time: n.data?.scheduled_time,
					created_at: n.created_at
				}));
			})
	]);

	// Resolve meeting partner usernames in one batched call
	const partnerIds = meetings.map(m => getPartnerId(m, userId));
	const partnerUsernameMap = await buildUsernameMap(locals.supabase, partnerIds);

	// Build prompt_id → meeting map for inline context
	// Prefer scheduled/awaiting_feedback meetings over cancelled/completed
	const meetingsByPromptId: Record<string, {
		id: string;
		scheduled_time: string;
		duration_minutes: number;
		general_area: string | null;
		partner_username: string;
		state: string;
	}> = {};

	// Sort: active states first, then by most recent scheduled_time
	const sortedMeetings = [...meetings].sort((a, b) => {
		const activeStates = ['scheduled', 'awaiting_feedback'];
		const aActive = activeStates.includes(a.state) ? 0 : 1;
		const bActive = activeStates.includes(b.state) ? 0 : 1;
		if (aActive !== bActive) return aActive - bActive;
		return new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime();
	});

	for (const m of sortedMeetings) {
		if (!(m.prompt_id in meetingsByPromptId)) {
			meetingsByPromptId[m.prompt_id] = {
				id: m.id,
				scheduled_time: m.scheduled_time,
				duration_minutes: m.duration_minutes,
				general_area: m.general_area,
				partner_username: partnerUsernameMap.get(getPartnerId(m, userId)) ?? 'anonymous',
				state: m.state
			};
		}
	}

	return {
		prompts,
		meetingsByPromptId,
		receivedInvitations,
		respondedPrompts,
		feedbackDue,
		cancelledNotifications,
		attentionCount: receivedInvitations.length + feedbackDue.length + (cancelledNotifications?.length ?? 0)
	};
};
