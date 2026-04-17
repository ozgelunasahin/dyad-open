import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** DELETE /api/invitations/[id] — withdraw pending invitation */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		await service.cancel(params.id, user.id);
		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[invitations/cancel]');
	}
};
