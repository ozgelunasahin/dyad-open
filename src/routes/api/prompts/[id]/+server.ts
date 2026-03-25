import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';

/** GET /api/prompts/[id] — prompt detail */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabasePromptQueryService(locals.supabase);
	const detail = await service.getPromptDetail(params.id, user.id);

	if (!detail) {
		return json({ error: 'Prompt not found' }, { status: 404 });
	}
	return json(detail);
};

/** PATCH /api/prompts/[id] — update content/image */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<{
		title?: string;
		body?: unknown;
		coverImageUrl?: string;
	}>(request);
	if (errorResponse) return errorResponse;

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		const prompt = await service.update(params.id, user.id, {
			title: body.title,
			body: body.body as import('@tiptap/core').JSONContent | undefined,
			coverImageUrl: body.coverImageUrl
		});
		return json(prompt);
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};

/** DELETE /api/prompts/[id] — delete a draft */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		await service.deleteDraft(params.id, user.id);
		return json({ ok: true });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
