import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';

/** POST /api/meetings/[id]/cancel — cancel with optional reason */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<{ reason?: string }>(request);
	if (errorResponse) return errorResponse;

	if (body.reason !== undefined) {
		if (typeof body.reason !== 'string' || body.reason.length > 2000) {
			return json({ error: 'Reason must be a string up to 2000 characters' }, { status: 400 });
		}
	}

	const service = new SupabaseMeetingService(locals.supabase);
	try {
		const tier = await service.cancel(params.id, body.reason);
		return json({ ok: true, tier });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
