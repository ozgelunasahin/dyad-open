import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim() || 'Untitled';

		const service = new SupabasePromptCommandService(locals.supabase);
		try {
			const prompt = await service.create(locals.user!.id, { title });
			redirect(303, `/prompts/${prompt.id}/edit`);
		} catch (err) {
			if ((err as any)?.status === 303) throw err; // re-throw redirect
			return fail(500, { error: 'Failed to create prompt. Please try again.' });
		}
	}
};
