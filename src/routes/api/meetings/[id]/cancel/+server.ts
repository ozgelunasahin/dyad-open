import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { env } from '$env/dynamic/public';

/** POST /api/meetings/[id]/cancel — cancel with optional reason */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const upactor = requireIdentity(locals);

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
		if (env.PUBLIC_POSTHOG_KEY) {
			fetch('https://eu.i.posthog.com/capture/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					api_key: env.PUBLIC_POSTHOG_KEY,
					distinct_id: upactor.id,
					event: 'meeting_cancelled',
					properties: { meeting_id: params.id, tier }
				})
			}).catch(() => {});
		}
		return json({ ok: true, tier });
	} catch (err) {
		return handleServiceError(err, '[meetings/cancel]');
	}
};
