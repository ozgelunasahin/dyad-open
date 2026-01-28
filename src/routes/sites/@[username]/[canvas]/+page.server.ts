import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildLandingCanvasData } from '$lib/server/load-site-sections';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('id, username, can_publish_sites')
		.eq('username', params.username)
		.single();

	if (profileError || !profile) {
		error(404, 'User not found');
	}

	if (!profile.can_publish_sites) {
		error(404, 'Page not found');
	}

	const isAuthor = locals.user?.id === profile.id;

	// Check if params.canvas matches an explicit site slug
	const { data: site } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published')
		.eq('user_id', profile.id)
		.eq('slug', params.canvas)
		.eq('is_published', true)
		.single();

	if (site) {
		const { vault, savedPositions, navItems } = await buildLandingCanvasData(
			locals.supabase,
			site.id
		);

		return {
			mode: 'site' as const,
			site: { id: site.id, name: site.name, slug: site.slug },
			author: { username: params.username },
			isAuthor,
			vault,
			savedPositions,
			navItems
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
		author: { username: params.username },
		isAuthor,
		siteCanvases: (allCanvases ?? []).map((c) => ({
			name: c.name,
			slug: c.slug
		})),
		canvasUrl: `/@${params.username}/${params.canvas}?readonly=true`
	};
};
