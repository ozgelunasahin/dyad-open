import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const service = new SupabaseFeedbackService(locals.supabase);

	const [form, vocabulary] = await Promise.all([
		// Load by form ID — the gate redirects with form ID in the URL
		service.getMyForm(params.id, locals.user!.id).catch(() => null),
		service.getVocabulary()
	]);

	// If the form doesn't exist or isn't for this user, redirect away
	if (!form) {
		redirect(302, '/discover');
	}

	return { form, vocabulary };
};
