import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Validate slug format
function isValidSlug(slug: string): boolean {
	return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}

// GET /api/sites/[id] - Get site details
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: site, error } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published, created_at, updated_at')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (error || !site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	return json(site);
};

// PATCH /api/sites/[id] - Update site
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify ownership
	const { data: existing } = await locals.supabase
		.from('sites')
		.select('id')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!existing) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (typeof body !== 'object' || body === null) {
		return json({ error: 'Request body must be an object' }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	const { name, slug, is_published } = body as {
		name?: string;
		slug?: string;
		is_published?: boolean;
	};

	if (name !== undefined) {
		if (typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Name must be a non-empty string' }, { status: 400 });
		}
		if (name.length > 200) {
			return json({ error: 'Name must be 200 characters or less' }, { status: 400 });
		}
		updates.name = name.trim();
	}

	if (slug !== undefined) {
		if (!isValidSlug(slug)) {
			return json({ error: 'Invalid slug format' }, { status: 400 });
		}
		updates.slug = slug;
	}

	if (is_published !== undefined) {
		if (typeof is_published !== 'boolean') {
			return json({ error: 'is_published must be a boolean' }, { status: 400 });
		}

		// When publishing, verify site has at least one canvas
		if (is_published) {
			const { data: canvases } = await locals.supabase
				.from('site_canvases')
				.select('canvas_id')
				.eq('site_id', params.id)
				.limit(1);

			if (!canvases || canvases.length === 0) {
				return json({ error: 'Cannot publish a site with no canvases' }, { status: 400 });
			}
		}

		updates.is_published = is_published;
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No valid fields to update' }, { status: 400 });
	}

	const { data: site, error } = await locals.supabase
		.from('sites')
		.update(updates)
		.eq('id', params.id)
		.select('id, name, slug, is_published, created_at, updated_at')
		.single();

	if (error) {
		if (error.code === '23505') {
			return json({ error: 'A site with this slug already exists' }, { status: 409 });
		}
		console.error('Failed to update site:', error);
		return json({ error: 'Failed to update site' }, { status: 500 });
	}

	return json(site);
};

// DELETE /api/sites/[id] - Delete site
export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { error } = await locals.supabase
		.from('sites')
		.delete()
		.eq('id', params.id)
		.eq('user_id', locals.user.id);

	if (error) {
		console.error('Failed to delete site:', error);
		return json({ error: 'Failed to delete site' }, { status: 500 });
	}

	return json({ success: true });
};
