import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserCanvases, createCanvas, deleteCanvas, getCanvasById } from '$lib/server/db/operations';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const canvases = await getUserCanvases(locals.user.id);

	return {
		user: locals.user,
		canvases
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

		let canvas;
		try {
			canvas = await createCanvas(locals.user.id, name, slug);
		} catch (err: unknown) {
			if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
				return fail(400, { error: 'A canvas with this name already exists' });
			}
			console.error('Create canvas error:', err);
			return fail(500, { error: 'Failed to create canvas' });
		}

		redirect(302, `/canvas/${canvas.id}`);
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

		// Verify ownership before deletion
		const canvas = await getCanvasById(canvasId);
		if (!canvas || canvas.userId !== locals.user.id) {
			return fail(403, { error: 'Access denied' });
		}

		try {
			await deleteCanvas(canvasId);
		} catch (err) {
			console.error('Delete canvas error:', err);
			return fail(500, { error: 'Failed to delete canvas' });
		}

		return { success: true };
	}
};
