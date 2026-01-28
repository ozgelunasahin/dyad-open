import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_PAGE_TYPES = ['page', 'hero', 'contact'];

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

export const GET: RequestHandler = async ({ params, locals }) => {
	const check = await verifySiteOwnership(locals, params.id);
	if (check.error) return check.error;

	const { data, error: dbError } = await locals.supabase
		.from('site_pages')
		.select('id, page_type, title, config, position')
		.eq('site_id', params.id)
		.order('position', { ascending: true });

	if (dbError) {
		console.error('Failed to load site pages:', dbError);
		error(500, 'Failed to load site pages');
	}

	return json(data);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const check = await verifySiteOwnership(locals, params.id);
	if (check.error) return check.error;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { page_type, title, config, position } = body as Record<string, unknown>;

	if (!page_type || !VALID_PAGE_TYPES.includes(page_type as string)) {
		error(400, `Invalid page type. Must be one of: ${VALID_PAGE_TYPES.join(', ')}`);
	}

	if (config !== undefined && (typeof config !== 'object' || config === null || Array.isArray(config))) {
		error(400, 'config must be a JSON object');
	}

	// Limit config size (~64KB)
	if (config && JSON.stringify(config).length > 65536) {
		error(400, 'config exceeds maximum size');
	}

	const { data, error: dbError } = await locals.supabase
		.from('site_pages')
		.insert({
			site_id: params.id,
			page_type,
			title: title || '',
			config: config || {},
			position: position ?? 0
		})
		.select()
		.single();

	if (dbError) {
		console.error('Failed to create page:', dbError);
		error(500, 'Failed to create page');
	}

	return json(data, { status: 201 });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const check = await verifySiteOwnership(locals, params.id);
	if (check.error) return check.error;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!Array.isArray(body)) {
		return json({ error: 'Request body must be an array' }, { status: 400 });
	}

	const pages = body as { id: string; position: number }[];

	for (const page of pages) {
		if (typeof page.id !== 'string' || typeof page.position !== 'number') {
			return json({ error: 'Each entry must have string id and number position' }, { status: 400 });
		}
	}

	for (const page of pages) {
		const { error: dbError } = await locals.supabase
			.from('site_pages')
			.update({ position: page.position })
			.eq('id', page.id)
			.eq('site_id', params.id);

		if (dbError) {
			console.error('Failed to update page positions:', dbError);
			error(500, 'Failed to update page positions');
		}
	}

	return json({ ok: true });
};
