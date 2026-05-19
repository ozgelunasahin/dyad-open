import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import {
	deferEmail,
	notifyInvitationAccepted,
	notifyMultiInviteCourtesy
} from '$lib/server/notification-emails.js';

/** POST /api/invitations/[id]/accept — accept invitation, create meeting atomically */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
	// Auth guard: throws 401 if not signed in. Identity itself is unused
	// here — RLS enforces ownership on the underlying RPC call.
	const _upactor = requireIdentity(locals);

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		const meetingId = await service.accept(params.id);
		if (meetingId) {
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

				const { data: otherMeetings } = await locals.supabase
					.from('meetings')
					.select('participant_b')
					.eq('slot_id', invitation.slot_id)
					.neq('id', meetingId)
					.in('state', ['scheduled', 'awaiting_feedback']);
				const others = (otherMeetings ?? []).map((m) => m.participant_b);
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
		} else {
			return json(
				{ ok: false, error: 'That slot was booked by someone else, or the invitation has expired.' },
				{ status: 409 }
			);
		}
	} catch (err) {
		return handleServiceError(err, '[invitations/accept]');
	}
};
