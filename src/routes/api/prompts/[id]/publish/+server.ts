import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabasePromptCommandService } from '$lib/services/prompt-command.js';
import { SupabaseScopeService } from '$lib/services/scope.js';
import type { TimeSlotInput } from '$lib/domain/types.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';

/** POST /api/prompts/[id]/publish — publish a draft with time slots.
 *
 * Optional `audience_scope` selects a corner. The caller must currently hold
 * an active grant for the chosen scope; absent or null means publish to the
 * Berlin commons. Once published, audience_scope is immutable on the row.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<{
		slots: TimeSlotInput[];
		audience_scope?: string | null;
		capacity?: number | null;
	}>(request);
	if (errorResponse) return errorResponse;

	if (!Array.isArray(body.slots) || body.slots.length === 0) {
		return json({ error: 'At least one time slot is required' }, { status: 400 });
	}

	// Validate audience_scope if provided. The form-action layer enforces that
	// the caller belongs to the chosen scope; defense-in-depth prevents direct
	// API tampering. RLS on prompts also gates SELECT for non-grantees, so a
	// successful publish that the author can't read would surface immediately.
	let validatedScope: string | null = null;
	if (body.audience_scope !== undefined && body.audience_scope !== null && body.audience_scope !== '') {
		if (typeof body.audience_scope !== 'string') {
			return json({ error: 'audience_scope must be a string or null' }, { status: 400 });
		}
		const scopeService = new SupabaseScopeService(locals.supabase);
		const memberships = await scopeService.listMyScopes(upactor.id);
		if (!memberships.some((m) => m.scope === body.audience_scope)) {
			return json(
				{ error: 'You do not have access to that corner' },
				{ status: 403 }
			);
		}
		validatedScope = body.audience_scope;
	}

	// Verify cover image exists before publishing
	const { data: prompt } = await locals.supabase
		.from('prompts')
		.select('cover_image_url')
		.eq('id', params.id)
		.eq('author_id', upactor.id)
		.single();

	if (!prompt?.cover_image_url) {
		return json({ error: 'Cover image is required to publish' }, { status: 400 });
	}

	// Type guard only: capacity must be a number or null. The service
	// (PromptCommandService.publish) is the canonical bounds validator — it
	// throws a DomainError for out-of-range values, surfaced as a 400 by
	// handleServiceError. 1 = one-on-one, 2-7 = small group (up to 8 total
	// incl. the author). Absent/null lets the service default to one-on-one on
	// first publish; on republish the stored value is preserved.
	let validatedCapacity: number | null = null;
	if (body.capacity !== undefined && body.capacity !== null) {
		if (typeof body.capacity !== 'number') {
			return json({ error: 'Group size must be a number' }, { status: 400 });
		}
		validatedCapacity = body.capacity;
	}

	const service = new SupabasePromptCommandService(locals.supabase);
	try {
		await service.publish(params.id, upactor.id, body.slots, validatedScope, validatedCapacity);
		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[prompts/publish]');
	}
};
