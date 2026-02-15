import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const canvasId = url.searchParams.get('canvas_id');
	if (!canvasId) {
		error(400, 'canvas_id is required');
	}

	const { data, error: dbError } = await locals.supabase
		.from('highlights')
		.select(`
			id, canvas_id, note_slug, user_id, selected_text, start_offset, end_offset, created_at,
			comments (id, user_id, body, created_at)
		`)
		.eq('canvas_id', canvasId)
		.order('created_at', { ascending: true });

	if (dbError) {
		console.error('Failed to load highlights:', dbError);
		error(500, 'Failed to load highlights');
	}

	// Fetch usernames for all involved users
	const userIds = new Set<string>();
	for (const h of data ?? []) {
		userIds.add(h.user_id);
		for (const c of h.comments ?? []) {
			userIds.add(c.user_id);
		}
	}

	const { data: profiles } = userIds.size > 0
		? await locals.supabase
				.from('profiles')
				.select('id, username')
				.in('id', [...userIds])
		: { data: [] };

	const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) ?? []);

	const enriched = (data ?? []).map((h) => ({
		...h,
		username: usernameMap.get(h.user_id) ?? 'unknown',
		comments: (h.comments ?? []).map((c: { id: string; user_id: string; body: string; created_at: string }) => ({
			...c,
			username: usernameMap.get(c.user_id) ?? 'unknown'
		}))
	}));

	return json(enriched);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const body = await request.json();
	const { canvas_id, note_slug, selected_text, start_offset, end_offset } = body;

	if (!canvas_id || !note_slug || !selected_text || start_offset == null || end_offset == null) {
		error(400, 'Missing required fields');
	}

	if (typeof selected_text !== 'string' || selected_text.length > 5000) {
		error(400, 'Invalid selected text');
	}

	const { data, error: dbError } = await locals.supabase
		.from('highlights')
		.insert({
			canvas_id,
			note_slug,
			user_id: locals.user.id,
			selected_text,
			start_offset,
			end_offset
		})
		.select('id, canvas_id, note_slug, user_id, selected_text, start_offset, end_offset, created_at')
		.single();

	if (dbError) {
		console.error('Failed to create highlight:', dbError);
		error(500, 'Failed to create highlight');
	}

	return json(data, { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const id = url.searchParams.get('id');
	if (!id) {
		error(400, 'id is required');
	}

	const { error: dbError } = await locals.supabase
		.from('highlights')
		.delete()
		.eq('id', id)
		.eq('user_id', locals.user.id);

	if (dbError) {
		console.error('Failed to delete highlight:', dbError);
		error(500, 'Failed to delete highlight');
	}

	return json({ ok: true });
};
