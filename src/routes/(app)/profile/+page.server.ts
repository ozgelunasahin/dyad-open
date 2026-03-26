import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [prompts, meetings, sentInvitations] = await Promise.all([
		new SupabasePromptQueryService(locals.supabase).getMyPrompts(userId),
		new SupabaseMeetingService(locals.supabase).getMyMeetings(userId),
		locals.supabase
			.from('prompt_invitations')
			.select('id, prompt_id, slot_id, state, created_at, prompts:prompt_id(title)')
			.eq('inviter_id', userId)
			.order('created_at', { ascending: false })
			.then(({ data }) => data ?? [])
	]);

	return { prompts, meetings, sentInvitations };
};
