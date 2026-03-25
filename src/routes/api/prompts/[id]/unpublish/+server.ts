import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';

/** POST /api/prompts/[id]/unpublish — archive a published prompt */
export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		await service.unpublish(params.id, user.id);
		return json({ ok: true });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
