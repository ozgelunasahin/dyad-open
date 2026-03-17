import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { meeting_id, did_meet, tags, body: note } = body;

	if (!meeting_id || typeof did_meet !== 'boolean') {
		console.error('[meeting-feedback] Validation failed:', { meeting_id, did_meet, bodyKeys: Object.keys(body) });
		error(400, `meeting_id and did_meet are required. Got: meeting_id=${String(meeting_id)}, did_meet type=${typeof did_meet}`);
	}

	// Verify the user is a participant in this meeting
	const { data: meeting } = await locals.supabase
		.from('meeting_invitations')
		.select('id, inviter_id, invitee_id, status')
		.eq('id', meeting_id)
		.single();

	if (!meeting) {
		error(404, 'Meeting not found');
	}

	const { inviter_id, invitee_id } = meeting;
	const userId = locals.user.id;

	if (userId !== inviter_id && userId !== invitee_id) {
		error(403, 'You are not a participant in this meeting');
	}

	const reviewee_id = userId === inviter_id ? invitee_id : inviter_id;

	const { error: dbError } = await locals.supabase
		.from('meeting_feedback')
		.insert({
			meeting_id,
			reviewer_id: userId,
			reviewee_id,
			did_meet,
			tags: Array.isArray(tags) ? tags : [],
			body: typeof note === 'string' && note.trim() ? note.trim() : null
		});

	if (dbError) {
		if (dbError.code === '23505') {
			return json({ ok: true }); // already submitted, treat as success
		}
		console.error('Failed to save meeting feedback:', dbError);
		error(500, 'Failed to save feedback');
	}

	return json({ ok: true }, { status: 201 });
};
