import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import type { GroupFeedbackInput } from '$lib/services/feedback.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

const MAX_TEXT = 2000;

/** PATCH /api/feedback/group/[id] — submit group feedback */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// Auth is the primary check; RLS + the RPC's own owner check are the net.
	requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<GroupFeedbackInput>(request);
	if (errorResponse) return errorResponse;

	if (typeof body.meet_again !== 'boolean') {
		return json({ error: 'meet_again is required' }, { status: 400 });
	}
	if (body.comment !== undefined && (typeof body.comment !== 'string' || body.comment.length > MAX_TEXT)) {
		return json({ error: 'Invalid comment' }, { status: 400 });
	}
	if (
		body.personal_feedback !== undefined &&
		(typeof body.personal_feedback !== 'string' || body.personal_feedback.length > MAX_TEXT)
	) {
		return json({ error: 'Invalid personal feedback' }, { status: 400 });
	}

	const service = new SupabaseFeedbackService(locals.supabase);
	try {
		const newState = await service.submitGroupFeedback(params.id, {
			meet_again: body.meet_again,
			comment: body.comment?.trim() || undefined,
			personal_feedback: body.personal_feedback?.trim() || undefined
		});
		return json({ ok: true, state: newState });
	} catch (err) {
		return handleServiceError(err, '[feedback/group/patch]');
	}
};
