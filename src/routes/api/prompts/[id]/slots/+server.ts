import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import type { TimeSlotInput } from '$lib/domain/types.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** PATCH /api/prompts/[id]/slots — add, edit, or remove slots */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<{
		add?: TimeSlotInput[];
		edit?: Array<{ slotId: string; updates: Partial<TimeSlotInput> }>;
		remove?: string[];
	}>(request);
	if (errorResponse) return errorResponse;

	const service = new SupabasePromptCommandService(locals.supabase);

	try {
		// Process removals first (frees up slot count)
		if (body.remove?.length) {
			for (const slotId of body.remove) {
				await service.removeSlot(slotId, user.id);
			}
		}

		// Process edits
		if (body.edit?.length) {
			for (const { slotId, updates } of body.edit) {
				await service.editSlot(slotId, user.id, updates);
			}
		}

		// Process additions last (checks slot count)
		if (body.add?.length) {
			await service.addSlots(params.id, user.id, body.add);
		}

		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[prompts/slots]');
	}
};
