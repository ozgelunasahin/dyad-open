import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/sites/[id]/canvases - Get canvases in site with positions
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify site ownership
	const { data: site } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	// Get site_canvases with canvas details
	const { data: siteCanvases, error } = await locals.supabase
		.from('site_canvases')
		.select(`
			canvas_id,
			position,
			canvases!inner (
				id,
				name,
				slug
			)
		`)
		.eq('site_id', params.id)
		.order('position', { ascending: true });

	if (error) {
		console.error('Failed to load site canvases:', error);
		return json({ error: 'Failed to load site canvases' }, { status: 500 });
	}

	// Flatten the response
	const canvases = (siteCanvases ?? []).map((sc) => ({
		id: (sc.canvases as { id: string }).id,
		name: (sc.canvases as { name: string }).name,
		slug: (sc.canvases as { slug: string }).slug,
		position: sc.position
	}));

	return json(canvases);
};

// PUT /api/sites/[id]/canvases - Set canvas selection and order (replaces all)
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify site ownership
	const { data: site } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!Array.isArray(body)) {
		return json({ error: 'Request body must be an array of canvas IDs' }, { status: 400 });
	}

	// Validate that all entries are strings (canvas IDs)
	const canvasIds = body as unknown[];
	for (const id of canvasIds) {
		if (typeof id !== 'string') {
			return json({ error: 'Each canvas ID must be a string' }, { status: 400 });
		}
	}

	const uniqueCanvasIds = [...new Set(canvasIds as string[])];

	// Use atomic RPC function to update site canvases
	// This ensures delete + insert happen in a single transaction (no data loss on partial failure)
	const { data: result, error: rpcError } = await locals.supabase.rpc('update_site_canvases', {
		p_site_id: params.id,
		p_canvas_ids: uniqueCanvasIds
	});

	if (rpcError) {
		console.error('Failed to update site canvases:', rpcError);
		return json({ error: 'Failed to update site canvases' }, { status: 500 });
	}

	// Check for application-level errors from the function
	if (result && typeof result === 'object' && 'error' in result) {
		const errorResult = result as { error: string };
		// Determine appropriate status code based on error
		if (errorResult.error.includes('not found') || errorResult.error.includes('not owned')) {
			return json({ error: errorResult.error }, { status: 403 });
		}
		return json({ error: errorResult.error }, { status: 400 });
	}

	return json(result ?? { success: true, count: uniqueCanvasIds.length });
};

// PATCH /api/sites/[id]/canvases - Update positions only (for reordering with pages)
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

	const updates: { canvas_id: string; position: number }[] = await request.json();

	for (const u of updates) {
		const { error } = await locals.supabase
			.from('site_canvases')
			.update({ position: u.position })
			.eq('site_id', params.id)
			.eq('canvas_id', u.canvas_id);

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
	}

	return json({ ok: true });
};
