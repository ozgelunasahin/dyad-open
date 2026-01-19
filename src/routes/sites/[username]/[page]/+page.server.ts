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

	// Get the specific canvas (canvases.user_id = profiles.id)
	const { data: canvas, error: canvasError } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, entry_point_note_id')
		.eq('user_id', profile.id)
		.eq('slug', params.page)
		.eq('is_published', true)
		.single();

	if (canvasError || !canvas) {
		error(404, 'Page not found');
	}

	// Get all published canvases for navigation
	const { data: allCanvases } = await locals.supabase
		.from('canvases')
		.select('name, slug')
		.eq('user_id', profile.id)
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
		canvasUrl: `/@${params.username}/${params.page}`
	};
};
