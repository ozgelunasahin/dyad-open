import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const { data: canvases, error } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, is_published, entry_point_note_id, created_at, updated_at')
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load canvases:', error);
	}

	return {
		user: locals.user,
		canvases: canvases ?? []
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const name = data.get('name');

		if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
			return fail(400, { error: 'Canvas name must be between 1 and 100 characters' });
		}

		// Generate slug from name
		const slug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.substring(0, 50);

		if (!slug) {
			return fail(400, { error: 'Invalid canvas name' });
		}

		const id = nanoid();

		const { error } = await locals.supabase.from('canvases').insert({
			id,
			user_id: locals.user.id,
			name,
			slug
		});

		if (error) {
			if (error.code === '23505') {
				// Unique constraint violation
				return fail(400, { error: 'A canvas with this name already exists' });
			}
			console.error('Create canvas error:', error);
			return fail(500, { error: 'Failed to create canvas' });
		}

		redirect(302, `/canvas/${id}`);
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const canvasId = data.get('canvasId');

		if (typeof canvasId !== 'string') {
			return fail(400, { error: 'Invalid canvas ID' });
		}

		// RLS will handle ownership check, but we can verify it exists first
		const { data: canvas } = await locals.supabase
			.from('canvases')
			.select('id')
			.eq('id', canvasId)
			.single();

		if (!canvas) {
			return fail(403, { error: 'Canvas not found or access denied' });
		}

		const { error } = await locals.supabase.from('canvases').delete().eq('id', canvasId);

		if (error) {
			console.error('Delete canvas error:', error);
			return fail(500, { error: 'Failed to delete canvas' });
		}

		return { success: true };
	}
};
