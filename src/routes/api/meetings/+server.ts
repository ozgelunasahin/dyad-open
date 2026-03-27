import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

/** GET /api/meetings — list my meetings */
export const GET: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseMeetingService(locals.supabase);
	try {
		const meetings = await service.getMyMeetings(user.id);
		return json(meetings);
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
