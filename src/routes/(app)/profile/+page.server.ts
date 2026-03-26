import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [prompts, meetings] = await Promise.all([
		new SupabasePromptQueryService(locals.supabase).getMyPrompts(userId),
		new SupabaseMeetingService(locals.supabase).getMyMeetings(userId)
	]);

	return { prompts, meetings };
};
