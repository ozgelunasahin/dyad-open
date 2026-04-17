import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import type { TimeSlotInput } from '$lib/domain/types.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { env } from '$env/dynamic/public';

/** POST /api/prompts/[id]/publish — publish a draft with time slots */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);

	const [body, errorResponse] = await parseJsonBody<{ slots: TimeSlotInput[] }>(request);
	if (errorResponse) return errorResponse;

	if (!Array.isArray(body.slots) || body.slots.length === 0) {
		return json({ error: 'At least one time slot is required' }, { status: 400 });
	}

	// Verify cover image exists before publishing
	const { data: prompt } = await locals.supabase
		.from('prompts')
		.select('cover_image_url')
		.eq('id', params.id)
		.eq('author_id', user.id)
		.single();

	if (!prompt?.cover_image_url) {
		return json({ error: 'Cover image is required to publish' }, { status: 400 });
	}

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		await service.publish(params.id, user.id, body.slots);
		if (env.PUBLIC_POSTHOG_KEY) {
			fetch('https://eu.i.posthog.com/capture/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					api_key: env.PUBLIC_POSTHOG_KEY,
					distinct_id: user.id,
					event: 'conversation_published',
					properties: { prompt_id: params.id, slot_count: body.slots.length }
				})
			}).catch(() => {});
		}
		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[prompts/publish]');
	}
};
