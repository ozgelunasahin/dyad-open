import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const service = new SupabasePromptQueryService(locals.supabase);
	const profile = await service.getPublicProfile(params.username, locals.scopes, locals.homeScope);

	if (!profile) {
		error(404, 'User not found');
	}

	return {
		profile: {
			username: profile.username,
			display_name: profile.display_name
		},
		prompts: profile.prompts
	};
};
