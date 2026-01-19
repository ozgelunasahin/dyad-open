import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Get the specific canvas
	const { data: canvas, error: canvasError } = await locals.supabase
		.from('canvases')
		.select(
			`
			id,
			name,
			slug,
			entry_point_note_id,
			profiles!inner(username)
		`
		)
		.eq('profiles.username', params.username)
		.eq('slug', params.page)
		.eq('is_published', true)
		.single();

	if (canvasError || !canvas) {
		error(404, 'Page not found');
	}

	// Get all published canvases for navigation
	const { data: allCanvases } = await locals.supabase
		.from('canvases')
		.select(
			`
			name,
			slug,
			profiles!inner(username)
		`
		)
		.eq('profiles.username', params.username)
		.eq('is_published', true)
		.order('updated_at', { ascending: false });

	return {
		canvas: {
			id: canvas.id,
			name: canvas.name,
			slug: canvas.slug,
			entryPointNoteId: canvas.entry_point_note_id
		},
		author: {
			username: params.username
		},
		// Provide list of other canvases for navigation
		siteCanvases: (allCanvases ?? []).map((c) => ({
			name: c.name,
			slug: c.slug
		})),
		// The iframe will point to the standalone canvas view
		canvasUrl: `/${params.username}/${params.page}`
	};
};
