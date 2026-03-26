import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const userId = locals.user.id;

	const [profileResult, promptsResult] = await Promise.all([
		locals.supabase
			.from('profiles')
			.select('username')
			.eq('id', userId)
			.single(),
		new SupabasePromptQueryService(locals.supabase).getPublishedPrompts({
			region: 'berlin',
			userId
		})
	]);

	return {
		user: locals.user,
		username: profileResult.data?.username ?? '',
		prompts: promptsResult
	};
};
