import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import type { FeedbackInput } from '$lib/services/feedback.js';

/** GET /api/feedback/[id] — get my feedback form by form ID */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	// Query the form directly — RLS ensures only the reviewer can read it
	const { data, error } = await locals.supabase
		.from('feedback_forms')
		.select('id, meeting_id, reviewer_id, reviewee_id, did_meet, no_show_reason, rating_tags, free_text, share_with_person, state, submitted_at, locked_at, created_at')
		.eq('id', params.id)
		.eq('reviewer_id', user.id)
		.maybeSingle();

	if (error) return json({ error: error.message }, { status: 400 });
	if (!data) return json({ error: 'Form not found' }, { status: 404 });

	return json(data);
};

/** PATCH /api/feedback/[id] — submit/edit feedback */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<FeedbackInput>(request);
	if (errorResponse) return errorResponse;

	if (body.did_meet === undefined || body.did_meet === null) {
		return json({ error: 'did_meet is required' }, { status: 400 });
	}

	const service = new SupabaseFeedbackService(locals.supabase);
	try {
		const newState = await service.submit(params.id, body);
		return json({ ok: true, state: newState });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
