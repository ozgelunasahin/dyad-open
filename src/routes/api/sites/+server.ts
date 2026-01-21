import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Validate slug format
function isValidSlug(slug: string): boolean {
	return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}

// Generate slug from name
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 100);
}

// GET /api/sites - List user's sites
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data: sites, error } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published, created_at, updated_at')
		.eq('user_id', locals.user.id)
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load sites:', error);
		return json({ error: 'Failed to load sites' }, { status: 500 });
	}

	return json(sites ?? []);
};

// POST /api/sites - Create new site
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Check if user has sites feature enabled
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('can_publish_sites')
		.eq('id', locals.user.id)
		.single();

	if (!profile?.can_publish_sites) {
		return json({ error: 'Sites feature not enabled for this account' }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (typeof body !== 'object' || body === null || !('name' in body)) {
		return json({ error: 'Request body must have "name" field' }, { status: 400 });
	}

	const { name, slug: providedSlug } = body as { name: string; slug?: string };

	if (typeof name !== 'string' || name.trim().length === 0) {
		return json({ error: 'Name must be a non-empty string' }, { status: 400 });
	}

	if (name.length > 200) {
		return json({ error: 'Name must be 200 characters or less' }, { status: 400 });
	}

	// Use provided slug or generate from name
	const slug = providedSlug && typeof providedSlug === 'string'
		? providedSlug
		: generateSlug(name);

	if (!isValidSlug(slug)) {
		return json({ error: 'Invalid slug format (lowercase letters, numbers, hyphens only)' }, { status: 400 });
	}

	const { data: site, error } = await locals.supabase
		.from('sites')
		.insert({
			user_id: locals.user.id,
			name: name.trim(),
			slug
		})
		.select('id, name, slug, is_published, created_at, updated_at')
		.single();

	if (error) {
		if (error.code === '23505') {
			return json({ error: 'A site with this slug already exists' }, { status: 409 });
		}
		console.error('Failed to create site:', error);
		return json({ error: 'Failed to create site' }, { status: 500 });
	}

	return json(site, { status: 201 });
};
