import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/sites/[id]/canvases - Get canvas sections in site
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const { data: siteCanvases, error } = await locals.supabase
		.from('site_canvases')
		.select(`
			id,
			canvas_id,
			position,
			nav_label,
			nav_note_id,
			canvases!inner (
				id,
				name,
				slug
			)
		`)
		.eq('site_id', params.id)
		.order('position', { ascending: true });

	if (error) {
		return json({ error: 'Failed to load site canvases' }, { status: 500 });
	}

	const sections = (siteCanvases ?? []).map((sc) => ({
		id: sc.id,
		canvasId: (sc.canvases as { id: string }).id,
		canvasName: (sc.canvases as { name: string }).name,
		canvasSlug: (sc.canvases as { slug: string }).slug,
		position: sc.position,
		navLabel: sc.nav_label,
		navNoteId: sc.nav_note_id
	}));

	return json(sections);
};

// POST /api/sites/[id]/canvases - Add a canvas section
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const body = await request.json();
	const { canvas_id, nav_label, nav_note_id, position } = body as {
		canvas_id: string;
		nav_label?: string;
		nav_note_id?: string;
		position?: number;
	};

	if (!canvas_id || typeof canvas_id !== 'string') {
		return json({ error: 'canvas_id is required' }, { status: 400 });
	}

	// Verify canvas belongs to user
	const { data: canvas } = await locals.supabase
		.from('canvases')
		.select('id')
		.eq('id', canvas_id)
		.eq('user_id', locals.user.id)
		.single();

	if (!canvas) {
		return json({ error: 'Canvas not found' }, { status: 404 });
	}

	// Auto-assign position if not provided
	let pos = position;
	if (pos === undefined) {
		const { data: existing } = await locals.supabase
			.from('site_canvases')
			.select('position')
			.eq('site_id', params.id)
			.order('position', { ascending: false })
			.limit(1);

		const { data: existingPages } = await locals.supabase
			.from('site_pages')
			.select('position')
			.eq('site_id', params.id)
			.order('position', { ascending: false })
			.limit(1);

		const maxCanvas = existing?.[0]?.position ?? 0;
		const maxPage = existingPages?.[0]?.position ?? 0;
		pos = Math.max(maxCanvas, maxPage) + 1;
	}

	const { data: inserted, error } = await locals.supabase
		.from('site_canvases')
		.insert({
			site_id: params.id,
			canvas_id,
			position: pos,
			nav_label: nav_label || null,
			nav_note_id: nav_note_id || null
		})
		.select('id, canvas_id, position, nav_label, nav_note_id')
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json(inserted, { status: 201 });
};

// PATCH /api/sites/[id]/canvases - Update canvas sections by id
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const updates: { id: string; position?: number; nav_note_id?: string | null; nav_label?: string | null }[] = await request.json();

	for (const u of updates) {
		const patch: Record<string, unknown> = {};
		if (u.position !== undefined) patch.position = u.position;
		if ('nav_note_id' in u) patch.nav_note_id = u.nav_note_id;
		if ('nav_label' in u) patch.nav_label = u.nav_label;

		if (Object.keys(patch).length === 0) continue;

		const { error } = await locals.supabase
			.from('site_canvases')
			.update(patch)
			.eq('id', u.id)
			.eq('site_id', params.id);

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
	}

	return json({ ok: true });
};

// DELETE /api/sites/[id]/canvases - Remove a canvas section by id
export const DELETE: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const { section_id } = await request.json() as { section_id: string };

	if (!section_id) {
		return json({ error: 'section_id is required' }, { status: 400 });
	}

	const { error } = await locals.supabase
		.from('site_canvases')
		.delete()
		.eq('id', section_id)
		.eq('site_id', params.id);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ ok: true });
};
