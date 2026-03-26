import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';

// Visiting /prompts/new creates an untitled draft and redirects to the editor immediately
export const load: PageServerLoad = async ({ locals }) => {
	const service = new SupabasePromptCommandService(locals.supabase);
	const prompt = await service.create(locals.user!.id, {});
	redirect(303, `/prompts/${prompt.id}/edit`);
};
