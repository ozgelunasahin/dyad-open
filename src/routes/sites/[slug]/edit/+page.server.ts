import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Load the site
	const { data: site, error: siteError } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published, created_at, updated_at')
		.eq('slug', params.slug)
		.eq('user_id', locals.user.id)
		.single();

	if (siteError || !site) {
		error(404, 'Site not found');
	}

	// Load user's profile for username
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	// Load all user's canvases
	const { data: allCanvases } = await locals.supabase
		.from('canvases')
		.select('id, name, slug')
		.eq('user_id', locals.user.id)
		.order('updated_at', { ascending: false });

	// Load site's selected canvases
	const { data: siteCanvases } = await locals.supabase
		.from('site_canvases')
		.select('canvas_id, position')
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	// Build canvas list with inclusion status and position
	const includedIds = new Map(
		(siteCanvases ?? []).map((sc) => [sc.canvas_id, sc.position])
	);

	const canvases = (allCanvases ?? []).map((canvas) => ({
		id: canvas.id,
		name: canvas.name,
		slug: canvas.slug,
		included: includedIds.has(canvas.id),
		position: includedIds.get(canvas.id) ?? 999
	}));

	// Sort: included canvases first (by position), then excluded
	canvases.sort((a, b) => {
		if (a.included && !b.included) return -1;
		if (!a.included && b.included) return 1;
		return a.position - b.position;
	});

	return {
		user: locals.user,
		username: profile?.username ?? '',
		site,
		canvases
	};
};
