import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** POST /api/prompts/[id]/archive — archive a published prompt */
export const POST: RequestHandler = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		await service.archive(params.id, upactor.id);
		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[prompts/archive]');
	}
};
