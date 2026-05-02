import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseCommentService } from '$lib/services/comment.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { env } from '$env/dynamic/public';

/** POST /api/prompts/[id]/comments — create or edit comment (upsert) */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<{ body: string }>(request);
	if (errorResponse) return errorResponse;

	if (typeof body.body !== 'string' || body.body.length < 1 || body.body.length > 2000) {
		return json({ error: 'Comment must be between 1 and 2000 characters' }, { status: 400 });
	}

	const service = new SupabaseCommentService(locals.supabase);
	try {
		// author_id always from session, never from request body
		const comment = await service.createOrUpdate(params.id, upactor.id, body.body);
		if (env.PUBLIC_POSTHOG_KEY) {
			fetch('https://eu.i.posthog.com/capture/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					api_key: env.PUBLIC_POSTHOG_KEY,
					distinct_id: upactor.id,
					event: 'response_sent',
					properties: { prompt_id: params.id }
				})
			}).catch(() => {});
		}
		return json(comment, { status: 201 });
	} catch (err) {
		return handleServiceError(err, '[prompts/comments/post]');
	}
};

/** GET /api/prompts/[id]/comments — prompt author sees all; others see own */
export const GET: RequestHandler = async ({ params, locals }) => {
	requireIdentity(locals);

	const service = new SupabaseCommentService(locals.supabase);
	try {
		// RLS handles visibility — prompt author sees all, others see only own
		const comments = await service.getCommentsForPrompt(params.id);
		return json(comments);
	} catch (err) {
		return handleServiceError(err, '[prompts/comments/get]');
	}
};
