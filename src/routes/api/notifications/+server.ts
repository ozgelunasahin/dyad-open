import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const { data, error: dbError } = await locals.supabase
		.from('notifications')
		.select('id, type, data, read, created_at')
		.eq('user_id', locals.user.id)
		.order('created_at', { ascending: false })
		.limit(50);

	if (dbError) {
		console.error('Failed to load notifications:', dbError);
		error(500, 'Failed to load notifications');
	}

	const unreadCount = (data ?? []).filter((n) => !n.read).length;

	return json({ notifications: data ?? [], unreadCount });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const body = await request.json();
	const { ids, all } = body;

	if (!all && (!Array.isArray(ids) || ids.length === 0)) {
		error(400, 'ids array or { all: true } is required');
	}

	let query = locals.supabase
		.from('notifications')
		.update({ read: true })
		.eq('user_id', locals.user.id)
		.eq('read', false);

	if (!all) {
		query = query.in('id', ids);
	}

	const { error: dbError } = await query;

	if (dbError) {
		console.error('Failed to mark notifications as read:', dbError);
		error(500, 'Failed to update notifications');
	}

	return json({ ok: true });
};
