import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);
	const userId = upactor.id;
	const service = new SupabaseFeedbackService(locals.supabase);

	const form = await service.getGroupFormById(params.id, userId).catch(() => null);

	if (!form) {
		redirect(302, '/discover');
	}

	// Already submitted (bookmarked URL / back button) — nothing left to do.
	if (form.state === 'submitted') {
		redirect(302, '/discover');
	}

	return { form };
};
