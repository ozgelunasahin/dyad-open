import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { requireMembershipForAction } from '$lib/server/require-membership.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { makeAdminClient } from '$lib/server/supabase-admin.js';
import {
	deferEmail,
	notifyInvitationAccepted,
	notifyMultiInviteCourtesy
} from '$lib/server/notification-emails.js';

/** POST /api/invitations/[id]/accept — accept invitation, create meeting atomically */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	const upactor = requireIdentity(locals);

	// Taking a slot is a gated action ("respond_take_slot"). Primary check here;
	// the accept_invitation RPC body is the safety net for a direct-RPC bypass.
	const gate = await requireMembershipForAction('respond_take_slot', locals);
	if (gate) return gate;

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		// Throws a DomainError (409) when the slot is full / over capacity /
		// expired — handleServiceError surfaces that message to the author.
		const meetingId = await service.accept(params.id);
		const { data: invitation } = await locals.supabase
			.from('prompt_invitations')
			.select('inviter_id, slot_id')
			.eq('id', params.id)
			.maybeSingle();
		if (invitation?.inviter_id) {
			deferEmail(
				platform,
				notifyInvitationAccepted({ inviterUserId: invitation.inviter_id, meetingId })
			);

			// Service-role read: the acceptor is not a participant in the *other*
			// meetings on this slot, so locals.supabase would return nothing.
			const admin = makeAdminClient();
			const { data: otherMeetings } = await admin
				.from('meetings')
				.select('participant_a, participant_b')
				.eq('slot_id', invitation.slot_id)
				.neq('id', meetingId)
				.in('state', ['scheduled', 'awaiting_feedback']);
			const acceptor = upactor.id;
			const others = (otherMeetings ?? [])
				.flatMap((m) => [m.participant_a, m.participant_b])
				.filter((id) => id !== acceptor);
			if (others.length > 0) {
				deferEmail(
					platform,
					notifyMultiInviteCourtesy({
						existingParticipantUserIds: others,
						meetingId
					})
				);
			}
		}
		return json({ ok: true, meetingId });
	} catch (err) {
		return handleServiceError(err, '[invitations/accept]');
	}
};
