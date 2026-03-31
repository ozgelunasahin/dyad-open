import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { env } from '$env/dynamic/public';

/** POST /api/invitations/[id]/accept — accept invitation, create meeting atomically */
export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

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
						distinct_id: user.id,
						event: 'invitation_accepted',
						properties: { meeting_id: meetingId }
					})
				}).catch(() => {});
			}
			return json({ ok: true, meetingId });
		} else {
			return json({ ok: false, reason: 'Slot already booked or invitation expired' }, { status: 409 });
		}
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
