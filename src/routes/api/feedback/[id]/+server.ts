import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import type { FeedbackInput } from '$lib/services/feedback.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { env } from '$env/dynamic/public';

/** GET /api/feedback/[id] — get my feedback form by form ID */
export const GET: RequestHandler = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);

	// Query the form directly — RLS ensures only the reviewer can read it
	const { data, error } = await locals.supabase
		.from('feedback_forms')
		.select('id, meeting_id, reviewer_id, reviewee_id, did_meet, no_show_reason, rating_tags, free_text, share_with_person, state, submitted_at, locked_at, created_at')
		.eq('id', params.id)
		.eq('reviewer_id', upactor.id)
		.maybeSingle();

	if (error) return handleServiceError(error, '[feedback/get]');
	if (!data) return json({ error: 'Form not found' }, { status: 404 });

	return json(data);
};

/** PATCH /api/feedback/[id] — submit/edit feedback */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<FeedbackInput>(request);
	if (errorResponse) return errorResponse;

	if (body.did_meet === undefined || body.did_meet === null) {
		return json({ error: 'did_meet is required' }, { status: 400 });
	}

	// Look up meeting_id before submitting (needed for analytics)
	const { data: formRow } = await locals.supabase
		.from('feedback_forms')
		.select('meeting_id')
		.eq('id', params.id)
		.eq('reviewer_id', upactor.id)
		.maybeSingle();

	const service = new SupabaseFeedbackService(locals.supabase);
	try {
		const newState = await service.submit(params.id, body);
		if (env.PUBLIC_POSTHOG_KEY && formRow?.meeting_id) {
			fetch('https://eu.i.posthog.com/capture/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					api_key: env.PUBLIC_POSTHOG_KEY,
					distinct_id: upactor.id,
					event: 'feedback_submitted',
					properties: { meeting_id: formRow.meeting_id, did_meet: body.did_meet }
				})
			}).catch(() => {});
		}

		// If both parties submitted (locked), return revealed feedback directly
		// to eliminate a second client round trip
		if (newState === 'locked') {
			const form = await service.getFormById(params.id, upactor.id);
			if (form) {
				const revealed = await service.getRevealedFeedback(form.meeting_id, upactor.id);
				return json({ ok: true, state: newState, revealed });
			}
		}

		return json({ ok: true, state: newState });
	} catch (err) {
		return handleServiceError(err, '[feedback/patch]');
	}
};
