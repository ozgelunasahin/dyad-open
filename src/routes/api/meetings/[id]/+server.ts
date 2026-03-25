import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

/** GET /api/meetings/[id] — meeting detail (active: with location, cancelled: general area + cancellation info) */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabaseMeetingService(locals.supabase);
	try {
		// Try full detail with location first (active meetings)
		const withLocation = await service.getWithLocation(params.id);
		if (withLocation) {
			return json(withLocation);
		}

		// Fallback to detail without location (cancelled or other states)
		const detail = await service.getDetail(params.id);
		if (detail) {
			return json(detail);
		}

		return json({ error: 'Meeting not found' }, { status: 404 });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
