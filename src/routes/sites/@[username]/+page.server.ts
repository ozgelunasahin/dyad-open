import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// First check if user exists and has sites feature enabled
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
		error(404, 'Site not found');
	}

	// Get published canvases for this user (canvases.user_id = profiles.id)
	const { data: canvases, error: queryError } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, entry_point_note_id, updated_at')
		.eq('user_id', profile.id)
		.eq('is_published', true)
		.order('updated_at', { ascending: false });

	if (queryError) {
		console.error('Failed to load canvases:', queryError);
		error(500, 'Failed to load user canvases');
	}

	if (!canvases || canvases.length === 0) {
		return {
			user: { username: params.username },
			canvases: []
		};
	}

	return {
		user: {
			username: params.username
		},
		canvases: canvases.map((c) => ({
			id: c.id,
			name: c.name,
			slug: c.slug,
			entryPointNoteId: c.entry_point_note_id,
			updatedAt: c.updated_at
		}))
	};
};
