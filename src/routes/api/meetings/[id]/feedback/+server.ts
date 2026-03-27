import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';

/** GET /api/meetings/[id]/feedback — get revealed feedback after both locked */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseFeedbackService(locals.supabase);
	try {
		const revealed = await service.getRevealedFeedback(params.id, user.id);
		return json(revealed);
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
