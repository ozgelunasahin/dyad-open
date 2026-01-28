import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if (body.title !== undefined) updates.title = body.title;
	if (body.config !== undefined) updates.config = body.config;
	if (body.position !== undefined) updates.position = body.position;

	if (Object.keys(updates).length === 0) {
		error(400, 'No fields to update');
	}

	const { data, error: dbError } = await locals.supabase
		.from('site_pages')
		.update(updates)
		.eq('id', params.pageId)
		.eq('site_id', params.id)
		.select()
		.single();

	if (dbError) {
		error(500, dbError.message);
	}

	return json(data);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { error: dbError } = await locals.supabase
		.from('site_pages')
		.delete()
		.eq('id', params.pageId)
		.eq('site_id', params.id);

	if (dbError) {
		error(500, dbError.message);
	}

	return json({ ok: true });
};
