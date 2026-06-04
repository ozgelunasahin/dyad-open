import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import {
	deferEmail,
	notifyMeetingCancelled,
	notifyGatheringCancelled
} from '$lib/server/notification-emails.js';

/**
 * POST /api/meetings/[id]/cancel — cancel with optional reason.
 *
 * scope: 'pair' (default) cancels this one pair-meeting (either participant);
 * scope: 'gathering' is host-only and cancels every live pair on the slot in
 * one act (one tier/reason/free-pass — see cancel_gathering RPC), retiring
 * the slot. Authorization is enforced in the RPCs; this handler validates
 * input and fans out emails per affected recipient.
 */
export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<{ reason?: string; scope?: string }>(request);
	if (errorResponse) return errorResponse;

	if (body.reason !== undefined) {
		if (typeof body.reason !== 'string' || body.reason.length > 2000) {
			return json({ error: 'Reason must be a string up to 2000 characters' }, { status: 400 });
		}
	}

	const scope = body.scope ?? 'pair';
	if (scope !== 'pair' && scope !== 'gathering') {
		return json({ error: 'scope must be "pair" or "gathering"' }, { status: 400 });
	}

	const service = new SupabaseMeetingService(locals.supabase);
	try {
		if (scope === 'gathering') {
			const { tier, joiners } = await service.cancelGathering(params.id, body.reason);
			// One email per affected joiner — the kill switch and per-recipient
			// preference are enforced inside dispatch() per call. Each email links
			// the joiner's OWN pair-meeting page (meetings RLS hides other pairs').
			for (const { joinerId, meetingId } of joiners) {
				deferEmail(
					platform,
					notifyGatheringCancelled({
						joinerUserId: joinerId,
						meetingId,
						reason: body.reason ?? null
					})
				);
			}
			return json({ ok: true, tier });
		}

		const { data: meeting } = await locals.supabase
			.from('meetings')
			.select('participant_a, participant_b')
			.eq('id', params.id)
			.maybeSingle();

		const tier = await service.cancel(params.id, body.reason);

		if (meeting) {
			const other =
				meeting.participant_a === upactor.id ? meeting.participant_b : meeting.participant_a;
			deferEmail(
				platform,
				notifyMeetingCancelled({
					remainingParticipantUserId: other,
					meetingId: params.id,
					reason: body.reason ?? null
				})
			);
		}

		return json({ ok: true, tier });
	} catch (err) {
		return handleServiceError(err, '[meetings/cancel]');
	}
};
