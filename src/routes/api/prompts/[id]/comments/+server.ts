import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { requireMembershipForAction } from '$lib/server/require-membership.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseCommentService } from '$lib/services/comment.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** POST /api/prompts/[id]/comments — create or edit comment (upsert) */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const upactor = requireIdentity(locals);

	// Gate the create path only — editing an existing response stays ungated, so
	// a lapsed member can revise what they already wrote (matches the split RLS,
	// which gates INSERT and leaves the edit UPDATE open). "respond_take_slot"
	// also covers accepting an invitation (gated inside accept_invitation).
	const { data: existingResponse } = await locals.supabase
		.from('prompt_comments')
		.select('id')
		.eq('prompt_id', params.id)
		.eq('author_id', upactor.id)
		.maybeSingle();
	if (!existingResponse) {
		const gate = await requireMembershipForAction('respond_take_slot', locals);
		if (gate) return gate;
	}

	const [body, errorResponse] = await parseJsonBody<{ body: string }>(request);
	if (errorResponse) return errorResponse;

	if (typeof body.body !== 'string' || body.body.length < 1 || body.body.length > 2000) {
		return json({ error: 'Comment must be between 1 and 2000 characters' }, { status: 400 });
	}

	const service = new SupabaseCommentService(locals.supabase);
	try {
		// author_id always from session, never from request body
		const comment = await service.createOrUpdate(params.id, upactor.id, body.body);
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
