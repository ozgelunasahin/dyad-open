import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { notifyInvitationDeclined } from '$lib/server/notification-emails.js';

const MAX_REASON_LENGTH = 2000;

/** POST /api/invitations/[id]/decline — invitee declines a pending invitation */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const upactor = requireIdentity(locals);

	let body: unknown = {};
	const contentLength = request.headers.get('content-length');
	if (contentLength && contentLength !== '0') {
		try {
			body = await request.json();
		} catch {
			return json({ error: 'Invalid JSON body' }, { status: 400 });
		}
	}

	let reason: string | undefined;
	const rawReason = (body as { reason?: unknown }).reason;
	if (rawReason !== undefined && rawReason !== null && rawReason !== '') {
		if (typeof rawReason !== 'string') {
			return json({ error: 'reason must be a string' }, { status: 400 });
		}
		const trimmed = rawReason.trim();
		if (trimmed.length > MAX_REASON_LENGTH) {
			return json(
				{ error: `reason must be at most ${MAX_REASON_LENGTH} characters` },
				{ status: 400 }
			);
		}
		if (trimmed.length > 0) reason = trimmed;
	}

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		await service.decline(params.id, reason);
		// Suppress unused-variable warning while keeping the auth call as the
		// authoritative gate (the SQL function also enforces invitee identity).
		void upactor;

		const { data: invitation } = await locals.supabase
			.from('prompt_invitations')
			.select('inviter_id, prompt_id')
			.eq('id', params.id)
			.maybeSingle();
		if (invitation?.inviter_id && invitation.prompt_id) {
			void notifyInvitationDeclined({
				inviterUserId: invitation.inviter_id,
				promptId: invitation.prompt_id,
				reason
			});
		}

		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[invitations/decline]');
	}
};
