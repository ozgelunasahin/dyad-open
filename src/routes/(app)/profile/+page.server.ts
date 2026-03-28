import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [prompts, meetings, sentInvitations, receivedInvitations, respondedPrompts, feedbackDue] = await Promise.all([
		new SupabasePromptQueryService(locals.supabase).getMyPrompts(userId),
		new SupabaseMeetingService(locals.supabase).getMyMeetings(userId),

		// Invitations I sent
		locals.supabase
			.from('prompt_invitations')
			.select('id, prompt_id, slot_id, state, created_at, message, prompts:prompt_id(title)')
			.eq('inviter_id', userId)
			.order('created_at', { ascending: false })
			.then(({ data }) => data ?? []),

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
				const inviterIds = [...new Set(data.map((inv: any) => inv.inviter_id))];
				const { data: profiles } = await locals.supabase
					.from('profiles')
					.select('id, username')
					.in('id', inviterIds);
				const usernameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));
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

		// Prompts I responded to
		locals.supabase
			.from('prompt_comments')
			.select('prompt_id, body, created_at, prompts:prompt_id(title, state, author_id)')
			.eq('author_id', userId)
			.order('created_at', { ascending: false })
			.then(({ data }) => (data ?? []).map((c: any) => ({
				prompt_id: c.prompt_id,
				prompt_title: c.prompts?.title ?? 'Untitled',
				prompt_state: c.prompts?.state,
				response_body: c.body,
				created_at: c.created_at
			}))),

		// Feedback forms due
		locals.supabase
			.from('feedback_forms')
			.select('id, meeting_id, state')
			.eq('reviewer_id', userId)
			.eq('state', 'due')
			.then(({ data }) => data ?? [])
	]);

	return { prompts, meetings, sentInvitations, receivedInvitations, respondedPrompts, feedbackDue };
};
