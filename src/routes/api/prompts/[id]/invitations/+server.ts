import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

/** POST /api/prompts/[id]/invitations — create invitation (select slot + message) */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<{
		slotId: string;
		commentId?: string;
		message?: string;
	}>(request);
	if (errorResponse) return errorResponse;

	if (!body.slotId || typeof body.slotId !== 'string') {
		return json({ error: 'slotId is required' }, { status: 400 });
	}

	// Look up the prompt to get the author (invitee)
	const queryService = new SupabasePromptQueryService(locals.supabase);
	const prompt = await queryService.getPromptDetail(params.id, user.id);
	if (!prompt) {
		return json({ error: 'Prompt not found' }, { status: 404 });
	}

	if (prompt.author_id === user.id) {
		return json({ error: 'Cannot invite yourself' }, { status: 400 });
	}

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		const invitation = await service.create({
			promptId: params.id,
			slotId: body.slotId,
			inviterId: user.id,
			inviteeId: prompt.author_id,
			commentId: body.commentId,
			message: body.message
		});
		return json(invitation, { status: 201 });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
