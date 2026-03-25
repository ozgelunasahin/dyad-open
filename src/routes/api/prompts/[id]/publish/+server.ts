import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import type { TimeSlotInput } from '$lib/domain/types.js';

/** POST /api/prompts/[id]/publish — publish a draft with time slots */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<{ slots: TimeSlotInput[] }>(request);
	if (errorResponse) return errorResponse;

	if (!Array.isArray(body.slots) || body.slots.length === 0) {
		return json({ error: 'At least one time slot is required' }, { status: 400 });
	}

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		await service.publish(params.id, user.id, body.slots);
		return json({ ok: true });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
