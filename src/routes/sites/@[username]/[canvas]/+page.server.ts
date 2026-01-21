import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// First check if user has sites feature enabled
	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('id, username, can_publish_sites')
		.eq('username', params.username)
		.single();

	if (profileError || !profile) {
		error(404, 'User not found');
	}

	// Only users with can_publish_sites flag can have public sites
	if (!profile.can_publish_sites) {
		error(404, 'Page not found');
	}

	// Check if current user is the author
	const isAuthor = locals.user?.id === profile.id;

	// First, check if params.canvas matches an explicit site slug
	const { data: site } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published')
		.eq('user_id', profile.id)
		.eq('slug', params.canvas)
		.eq('is_published', true)
		.single();

	if (site) {
		// This is an explicit site - load its canvases
		const { data: siteCanvases } = await locals.supabase
			.from('site_canvases')
			.select(`
				canvas_id,
				position,
				canvases!inner (
					id,
					name,
					slug,
					entry_point_note_id
				)
			`)
			.eq('site_id', site.id)
			.order('position', { ascending: true });

		const canvases = (siteCanvases ?? []).map((sc) => ({
			id: (sc.canvases as { id: string }).id,
			name: (sc.canvases as { name: string }).name,
			slug: (sc.canvases as { slug: string }).slug,
			entryPointNoteId: (sc.canvases as { entry_point_note_id: string | null }).entry_point_note_id
		}));

		if (canvases.length === 0) {
			error(404, 'Site has no canvases');
		}

		const firstCanvas = canvases[0];

		return {
			mode: 'site' as const,
			site: {
				id: site.id,
				name: site.name,
				slug: site.slug
			},
			canvas: {
				id: firstCanvas.id,
				name: firstCanvas.name,
				slug: firstCanvas.slug,
				entryPointNoteId: firstCanvas.entryPointNoteId
			},
			author: {
				username: params.username
			},
			isAuthor,
			siteCanvases: canvases.map((c) => ({
				name: c.name,
				slug: c.slug
			})),
			canvasUrl: `/@${params.username}/${firstCanvas.slug}?readonly=true`
		};
	}

	// Backward compatibility: treat as a canvas slug (implicit site)
	const { data: canvas, error: canvasError } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, entry_point_note_id')
		.eq('user_id', profile.id)
		.eq('slug', params.canvas)
		.eq('is_published', true)
		.single();

	if (canvasError || !canvas) {
		error(404, 'Page not found');
	}

	// Get all published canvases for navigation (implicit site behavior)
	const { data: allCanvases } = await locals.supabase
		.from('canvases')
		.select('name, slug')
		.eq('user_id', profile.id)
		.eq('is_published', true)
		.order('updated_at', { ascending: false });

	return {
		mode: 'canvas' as const,
		canvas: {
			id: canvas.id,
			name: canvas.name,
			slug: canvas.slug,
			entryPointNoteId: canvas.entry_point_note_id
		},
		author: {
			username: params.username
		},
		isAuthor,
		siteCanvases: (allCanvases ?? []).map((c) => ({
			name: c.name,
			slug: c.slug
		})),
		canvasUrl: `/@${params.username}/${params.canvas}?readonly=true`
	};
};
