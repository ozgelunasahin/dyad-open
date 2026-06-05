import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { validateTiptapContent } from '$lib/server/validate-tiptap-content.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

const MAX_TITLE_LENGTH = 200;
const STORAGE_URL_PREFIX = `${PUBLIC_SUPABASE_URL}/storage/`;

/** POST /api/prompts — create a draft prompt */
export const POST: RequestHandler = async ({ request, locals }) => {
	const upactor = requireIdentity(locals);

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
		const prompt = await service.create(upactor.id, {
			title: body.title,
			body: body.body as import('@tiptap/core').JSONContent | undefined,
			coverImageUrl: body.coverImageUrl,
			// Corner-exclusive members (guests) write conversations in their
			// corner's region — slot locations validate against it at publish.
			region: locals.homeScope ? (locals.homeRegion ?? undefined) : undefined
		});
		return json(prompt, { status: 201 });
	} catch (err) {
		return handleServiceError(err, '[prompts]');
	}
};

/** GET /api/prompts — list the current user's prompts */
export const GET: RequestHandler = async ({ locals }) => {
	const upactor = requireIdentity(locals);

	const service = new SupabasePromptQueryService(locals.supabase);
	const prompts = await service.getMyPrompts(upactor.id);
	return json(prompts);
};
