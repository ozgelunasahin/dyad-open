import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_PAGE_TYPES = ['hero', 'contact'];

export const GET: RequestHandler = async ({ params, locals }) => {
	const { data, error: dbError } = await locals.supabase
		.from('site_pages')
		.select('id, page_type, title, config, position')
		.eq('site_id', params.id)
		.order('position', { ascending: true });

	if (dbError) {
		error(500, dbError.message);
	}

	return json(data);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const body = await request.json();
	const { page_type, title, config, position } = body;

	if (!page_type || !VALID_PAGE_TYPES.includes(page_type)) {
		error(400, `Invalid page type. Must be one of: ${VALID_PAGE_TYPES.join(', ')}`);
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
		error(500, dbError.message);
	}

	return json(data, { status: 201 });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	// Bulk update positions for all pages
	const pages: { id: string; position: number }[] = await request.json();

	for (const page of pages) {
		const { error: dbError } = await locals.supabase
			.from('site_pages')
			.update({ position: page.position })
			.eq('id', page.id)
			.eq('site_id', params.id);

		if (dbError) {
			error(500, dbError.message);
		}
	}

	return json({ ok: true });
};
