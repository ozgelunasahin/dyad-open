import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** GET /api/meetings — list my meetings */
export const GET: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseMeetingService(locals.supabase);
	try {
		const meetings = await service.getMyMeetings(user.id);
		return json(meetings);
	} catch (err) {
		return handleServiceError(err, '[meetings]');
	}
};
