import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Find user by username from auth.users metadata or a profiles table
	// For now, we'll query canvases directly and extract user info
	const { data: canvases, error: queryError } = await locals.supabase
		.from('canvases')
		.select(
			`
			id,
			name,
			slug,
			entry_point_note_id,
			updated_at,
			profiles!inner(username)
		`
		)
		.eq('profiles.username', params.username)
		.eq('is_published', true)
		.order('updated_at', { ascending: false });

	if (queryError) {
		console.error('Failed to load canvases:', queryError);
		error(500, 'Failed to load user canvases');
	}

	if (!canvases || canvases.length === 0) {
		// Check if user exists but has no published canvases
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('username')
			.eq('username', params.username)
			.single();

		if (!profile) {
			error(404, 'User not found');
		}

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
