import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const userId = locals.user.id;

	// Fetch all meetings where the user is involved
	const { data, error: dbError } = await locals.supabase
		.from('meeting_invitations')
		.select('id, canvas_id, inviter_id, invitee_id, location, proposed_time, message, status, created_at, updated_at')
		.or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
		.order('created_at', { ascending: false });

	if (dbError) {
		console.error('Failed to load meetings:', dbError);
		error(500, 'Failed to load meetings');
	}

	// Enrich with usernames and canvas names
	const userIds = new Set<string>();
	const canvasIds = new Set<string>();
	for (const m of data ?? []) {
		userIds.add(m.inviter_id);
		userIds.add(m.invitee_id);
		canvasIds.add(m.canvas_id);
	}

	const [profilesResult, canvasesResult] = await Promise.all([
		userIds.size > 0
			? locals.supabase.from('profiles').select('id, username').in('id', [...userIds])
			: { data: [] },
		canvasIds.size > 0
			? locals.supabase.from('canvases').select('id, name, slug').in('id', [...canvasIds])
			: { data: [] }
	]);

	const usernameMap = new Map(profilesResult.data?.map((p) => [p.id, p.username]) ?? []);
	const canvasMap = new Map(canvasesResult.data?.map((c) => [c.id, { name: c.name, slug: c.slug }]) ?? []);

	const enriched = (data ?? []).map((m) => ({
		...m,
		inviter_username: usernameMap.get(m.inviter_id) ?? 'unknown',
		invitee_username: usernameMap.get(m.invitee_id) ?? 'unknown',
		canvas_name: canvasMap.get(m.canvas_id)?.name ?? 'unknown',
		canvas_slug: canvasMap.get(m.canvas_id)?.slug ?? ''
	}));

	return json(enriched);
};

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
	const { canvas_id, invitee_id, location, proposed_time, message } = body;

	if (!canvas_id || !invitee_id) {
		error(400, 'canvas_id and invitee_id are required');
	}

	// Comment gate: verify the inviter has at least one comment on the conversation
	const { data: userHighlights } = await locals.supabase
		.from('highlights')
		.select('id, comments (id)')
		.eq('canvas_id', canvas_id)
		.eq('user_id', locals.user.id);

	const hasCommented = (userHighlights ?? []).some(
		(h) => h.comments && (h.comments as any[]).length > 0
	);

	// Also check if user has commented on someone else's highlights
	if (!hasCommented) {
		const { data: allHighlights } = await locals.supabase
			.from('highlights')
			.select('id, comments (id, user_id)')
			.eq('canvas_id', canvas_id);

		const hasCommentedOnOthers = (allHighlights ?? []).some(
			(h) => (h.comments as any[] ?? []).some((c: any) => c.user_id === locals.user.id)
		);

		if (!hasCommentedOnOthers) {
			error(403, 'You must comment on this conversation before sending a meeting invite');
		}
	}

	// City-based check: both users should be berlin_based
	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id, berlin_based')
		.in('id', [locals.user.id, invitee_id]);

	const inviterProfile = profiles?.find((p) => p.id === locals.user.id);
	const inviteeProfile = profiles?.find((p) => p.id === invitee_id);

	if (!inviterProfile?.berlin_based || !inviteeProfile?.berlin_based) {
		error(403, 'Meeting invitations are currently limited to Berlin-based users');
	}

	const { data, error: dbError } = await locals.supabase
		.from('meeting_invitations')
		.insert({
			canvas_id,
			inviter_id: locals.user.id,
			invitee_id,
			location: location || null,
			proposed_time: proposed_time || null,
			message: message || null
		})
		.select()
		.single();

	if (dbError) {
		if (dbError.code === '23505') {
			error(409, 'You already have a pending meeting invitation for this conversation');
		}
		console.error('Failed to create meeting invitation:', dbError);
		error(500, 'Failed to create meeting invitation');
	}

	// Create notification for the invitee
	const { data: inviterProfileData } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	const { data: canvas } = await locals.supabase
		.from('canvases')
		.select('name')
		.eq('id', canvas_id)
		.single();

	await locals.supabase.from('notifications').insert({
		user_id: invitee_id,
		type: 'meeting_invite',
		data: {
			meeting_id: data.id,
			inviter_username: inviterProfileData?.username ?? 'someone',
			canvas_name: canvas?.name ?? 'a conversation'
		}
	});

	return json(data, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	const { id, status: newStatus } = body;

	if (!id || !newStatus) {
		error(400, 'id and status are required');
	}

	if (!['accepted', 'declined'].includes(newStatus)) {
		error(400, 'Status must be accepted or declined');
	}

	// Verify the user is the invitee
	const { data: meeting } = await locals.supabase
		.from('meeting_invitations')
		.select('id, inviter_id, invitee_id, canvas_id, proposed_time')
		.eq('id', id)
		.single();

	if (!meeting || meeting.invitee_id !== locals.user.id) {
		error(403, 'Only the invitee can accept or decline');
	}

	// On acceptance, reveal exact location from the canvas's preferred_time_slots
	let revealedLocation: string | null = null;
	if (newStatus === 'accepted' && meeting.proposed_time) {
		const { data: canvas } = await locals.supabase
			.from('canvases')
			.select('preferred_time_slots')
			.eq('id', meeting.canvas_id)
			.single();

		if (canvas?.preferred_time_slots) {
			try {
				const parsed = JSON.parse(canvas.preferred_time_slots);
				if (Array.isArray(parsed.slots)) {
					// Match slot by reconstructing the proposed_time string
					for (const slot of parsed.slots) {
						const d = new Date(slot.date + 'T12:00:00');
						const dayStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
						let timeStr = '';
						if (slot.startTime) {
							const [h, m] = slot.startTime.split(':').map(Number);
							const start = new Date(2000, 0, 1, h, m);
							timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
						}
						const candidate = `${dayStr} at ${timeStr}`;
						if (candidate === meeting.proposed_time && slot.exactLocation) {
							revealedLocation = slot.exactLocation;
							break;
						}
					}
				}
			} catch { /* ignore parse errors */ }
		}
	}

	const updateData: Record<string, unknown> = {
		status: newStatus,
		updated_at: new Date().toISOString()
	};
	if (revealedLocation) {
		updateData.location = revealedLocation;
	}

	const { error: dbError } = await locals.supabase
		.from('meeting_invitations')
		.update(updateData)
		.eq('id', id);

	if (dbError) {
		console.error('Failed to update meeting invitation:', dbError);
		error(500, 'Failed to update meeting invitation');
	}

	// Notify the inviter
	const { data: responderProfile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	await locals.supabase.from('notifications').insert({
		user_id: meeting.inviter_id,
		type: 'meeting_response',
		data: {
			meeting_id: id,
			responder_username: responderProfile?.username ?? 'someone',
			response: newStatus
		}
	});

	return json({ ok: true });
};
