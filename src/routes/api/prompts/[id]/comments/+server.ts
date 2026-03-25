import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseCommentService } from '$lib/services/comment.js';

/** POST /api/prompts/[id]/comments — create or edit comment (upsert) */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<{ body: string }>(request);
	if (errorResponse) return errorResponse;

	if (typeof body.body !== 'string' || body.body.length < 1 || body.body.length > 2000) {
		return json({ error: 'Comment must be between 1 and 2000 characters' }, { status: 400 });
	}

	const service = new SupabaseCommentService(locals.supabase);
	try {
		// author_id always from session, never from request body
		const comment = await service.createOrUpdate(params.id, user.id, body.body);
		return json(comment, { status: 201 });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};

/** GET /api/prompts/[id]/comments — prompt author sees all; others see own */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseCommentService(locals.supabase);
	try {
		// RLS handles visibility — prompt author sees all, others see only own
		const comments = await service.getCommentsForPrompt(params.id);
		return json(comments);
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
