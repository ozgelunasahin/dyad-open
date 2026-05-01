import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { env } from '$env/dynamic/public';

/** POST /api/invitations/[id]/accept — accept invitation, create meeting atomically */
export const POST: RequestHandler = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		const meetingId = await service.accept(params.id);
		if (meetingId) {
			if (env.PUBLIC_POSTHOG_KEY) {
				fetch('https://eu.i.posthog.com/capture/', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						api_key: env.PUBLIC_POSTHOG_KEY,
						distinct_id: upactor.id,
						event: 'invitation_accepted',
						properties: { meeting_id: meetingId }
					})
				}).catch(() => {});
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
