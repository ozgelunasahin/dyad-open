import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';

/** POST /api/invitations/[id]/accept — accept invitation, create meeting atomically */
export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		const meetingId = await service.accept(params.id);
		if (meetingId) {
			return json({ ok: true, meetingId });
		} else {
			return json({ ok: false, reason: 'Slot already booked or invitation expired' }, { status: 409 });
		}
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
