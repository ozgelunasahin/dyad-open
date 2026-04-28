import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** GET /api/vocabulary — list active adjectives */
export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals.user);

	const service = new SupabaseFeedbackService(locals.supabase);
	try {
		const words = await service.getVocabulary();
		return json(words);
	} catch (err) {
		return handleServiceError(err, '[vocabulary]');
	}
};
