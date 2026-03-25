import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';

/** POST /api/invitations/[id]/accept — accept invitation (calls RPC for atomic slot booking) */
export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		const accepted = await service.accept(params.id, user.id);
		if (accepted) {
			return json({ ok: true, accepted: true });
		} else {
			return json({ ok: false, accepted: false, reason: 'Slot already booked' }, { status: 409 });
		}
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
