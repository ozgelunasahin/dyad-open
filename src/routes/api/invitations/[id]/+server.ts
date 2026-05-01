import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** DELETE /api/invitations/[id] — withdraw pending invitation */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);

	const service = new SupabaseInvitationService(locals.supabase);
	try {
		await service.cancel(params.id, upactor.id);
		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[invitations/cancel]');
	}
};
