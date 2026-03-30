import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { validateTiptapContent } from '$lib/server/validate-tiptap-content.js';

const MAX_TITLE_LENGTH = 200;
const STORAGE_URL_PREFIX = `${PUBLIC_SUPABASE_URL}/storage/`;

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

	if (body.title !== undefined && (typeof body.title !== 'string' || body.title.length > MAX_TITLE_LENGTH)) {
		return json({ error: `Title must be a string of at most ${MAX_TITLE_LENGTH} characters` }, { status: 400 });
	}

	if (body.body !== undefined) {
		const contentError = validateTiptapContent(body.body);
		if (contentError) return json({ error: contentError }, { status: 400 });
	}

	if (body.coverImageUrl !== undefined) {
		if (typeof body.coverImageUrl !== 'string' || !body.coverImageUrl.startsWith(STORAGE_URL_PREFIX)) {
			return json({ error: 'Invalid cover image URL' }, { status: 400 });
		}
	}

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

/** DELETE /api/prompts/[id] — delete a prompt (any state) */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		await service.deletePrompt(params.id, user.id);
		return json({ ok: true });
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 400 });
	}
};
