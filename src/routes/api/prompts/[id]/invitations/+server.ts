import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { deferEmail, notifyInvitationReceived } from '$lib/server/notification-emails.js';

/** POST /api/prompts/[id]/invitations — create invitation (select slot + message) */
export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<{
		slotId: string;
		commentId?: string;
		message?: string;
	}>(request);
	if (errorResponse) return errorResponse;

	if (!body.slotId || typeof body.slotId !== 'string') {
		return json({ error: 'slotId is required' }, { status: 400 });
	}

	if (body.message !== undefined) {
		if (typeof body.message !== 'string' || body.message.length < 1 || body.message.length > 500) {
			return json({ error: 'Message must be between 1 and 500 characters' }, { status: 400 });
		}
	}

	// Validate commentId ownership if provided
	if (body.commentId) {
		const { data: comment } = await locals.supabase
			.from('prompt_comments')
			.select('id')
			.eq('id', body.commentId)
			.eq('prompt_id', params.id)
			.eq('author_id', upactor.id)
			.single();
		if (!comment) {
			return json({ error: 'Invalid comment reference' }, { status: 400 });
		}
	}

	// Look up the prompt to get the author (invitee)
	const queryService = new SupabasePromptQueryService(locals.supabase);
	const prompt = await queryService.getPromptDetail(params.id, upactor.id);
	if (!prompt) {
		return json({ error: 'Prompt not found' }, { status: 404 });
	}

	if (prompt.author_id === upactor.id) {
		return json({ error: 'Cannot invite yourself' }, { status: 400 });
	}

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		const invitation = await service.create({
			promptId: params.id,
			slotId: body.slotId,
			inviterId: upactor.id,
			inviteeId: prompt.author_id,
			commentId: body.commentId,
			message: body.message
		});

		const { data: inviterProfile } = await locals.supabase
			.from('profiles')
			.select('username')
			.eq('id', upactor.id)
			.maybeSingle();
		deferEmail(
			platform,
			notifyInvitationReceived({
				authorUserId: prompt.author_id,
				inviterUsername: inviterProfile?.username || undefined,
				promptId: params.id
			})
		);

		return json(invitation, { status: 201 });
	} catch (err) {
		return handleServiceError(err, '[prompts/invitations]');
	}
};
