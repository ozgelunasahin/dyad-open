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

	if (!profile.can_publish_sites) {
		error(404, 'Page not found');
	}

	// Load the explicit site
	const { data: site } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published')
		.eq('user_id', profile.id)
		.eq('slug', params.site)
		.eq('is_published', true)
		.single();

	if (!site) {
		error(404, 'Site not found');
	}

	// Load site's canvases
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

	// Find the requested canvas
	const currentCanvas = canvases.find((c) => c.slug === params.canvas);

	if (!currentCanvas) {
		error(404, 'Canvas not found in this site');
	}

	const isAuthor = locals.user?.id === profile.id;

	return {
		mode: 'site' as const,
		site: {
			id: site.id,
			name: site.name,
			slug: site.slug
		},
		canvas: {
			id: currentCanvas.id,
			name: currentCanvas.name,
			slug: currentCanvas.slug,
			entryPointNoteId: currentCanvas.entryPointNoteId
		},
		author: {
			username: params.username
		},
		isAuthor,
		siteCanvases: canvases.map((c) => ({
			name: c.name,
			slug: c.slug
		})),
		canvasUrl: `/@${params.username}/${currentCanvas.slug}?readonly=true`
	};
};
