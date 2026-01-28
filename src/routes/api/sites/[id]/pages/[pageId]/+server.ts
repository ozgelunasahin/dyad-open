import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function verifySiteOwnership(locals: App.Locals, siteId: string) {
	if (!locals.user) {
		return { error: json({ error: 'Unauthorized' }, { status: 401 }) };
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', siteId)
		.eq('user_id', locals.user.id)
		.single();

	if (!site) {
		return { error: json({ error: 'Site not found' }, { status: 404 }) };
	}

	return { site };
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const check = await verifySiteOwnership(locals, params.id);
	if (check.error) return check.error;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { title, config, position } = body as Record<string, unknown>;
	const updates: Record<string, unknown> = {};

	if (title !== undefined) updates.title = title;
	if (config !== undefined) {
		if (typeof config !== 'object' || config === null || Array.isArray(config)) {
			error(400, 'config must be a JSON object');
		}
		if (JSON.stringify(config).length > 65536) {
			error(400, 'config exceeds maximum size');
		}
		updates.config = config;
	}
	if (position !== undefined) updates.position = position;

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
		console.error('Failed to update page:', dbError);
		error(500, 'Failed to update page');
	}

	return json(data);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const check = await verifySiteOwnership(locals, params.id);
	if (check.error) return check.error;

	const { error: dbError } = await locals.supabase
		.from('site_pages')
		.delete()
		.eq('id', params.pageId)
		.eq('site_id', params.id);

	if (dbError) {
		console.error('Failed to delete page:', dbError);
		error(500, 'Failed to delete page');
	}

	return json({ ok: true });
};
