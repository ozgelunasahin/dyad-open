import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { handleServiceError } from '$lib/server/handle-service-error.js';
import { DomainError } from '$lib/domain/errors.js';

interface ReportBody {
	description?: string;
}

// Interim safety floor (plan U7): a gathering participant flags a problem to
// moderators. Reuses the shared `feedback` table's 'report' type rather than a
// new table/route, and validates the report TARGET at the app layer — the
// shared table's INSERT policy stays permissive so general bug/feature/other
// feedback keeps working. The reporter must be a participant of the referenced
// meeting; that is enforced here (not via RLS) by reading the meeting through
// the caller's RLS-scoped client, which only returns meetings they are in.
const MAX_DESCRIPTION = 2000;

/** POST /api/meetings/[id]/report — flag a problem about a gathering. */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<ReportBody>(request);
	if (errorResponse) return errorResponse;

	const { description } = body;

	if (!description || typeof description !== 'string' || description.trim().length < 10) {
		return json({ error: 'Please write at least 10 characters' }, { status: 400 });
	}

	try {
		// Target constraint: the caller's RLS-scoped client only returns meetings
		// where they are participant_a or participant_b. A non-participant (or a
		// non-existent meeting) yields no row → reject. Reporter id comes from the
		// session, never the request body.
		const { data: meeting, error: lookupError } = await locals.supabase
			.from('meetings')
			.select('id, prompt_id')
			.eq('id', params.id)
			.maybeSingle();

		if (lookupError) {
			throw new Error(`Failed to load meeting: ${lookupError.message}`);
		}
		if (!meeting) {
			throw new DomainError('You can only report a problem about a meeting you are part of', 403);
		}

		const { error: insertError } = await locals.supabase.from('feedback').insert({
			user_id: upactor.id,
			type: 'report',
			description: description.trim().slice(0, MAX_DESCRIPTION),
			context: { meeting_id: meeting.id, prompt_id: meeting.prompt_id }
		});

		if (insertError) {
			throw new Error(`Failed to record report: ${insertError.message}`);
		}

		return json({ ok: true });
	} catch (err) {
		return handleServiceError(err, '[meetings/report]');
	}
};
