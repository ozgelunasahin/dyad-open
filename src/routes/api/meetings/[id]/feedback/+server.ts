import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** GET /api/meetings/[id]/feedback — get revealed feedback after both locked */
export const GET: RequestHandler = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);

	const service = new SupabaseFeedbackService(locals.supabase);
	try {
		const revealed = await service.getRevealedFeedback(params.id, upactor.id);
		return json(revealed);
	} catch (err) {
		return handleServiceError(err, '[meetings/feedback]');
	}
};
