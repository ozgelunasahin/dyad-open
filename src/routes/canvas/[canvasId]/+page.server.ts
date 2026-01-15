import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getCanvasById, updateCanvas, getUserById, getCardPositions } from '$lib/server/db/operations';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const canvas = await getCanvasById(params.canvasId);
	if (!canvas) {
		error(404, 'Canvas not found');
	}

	// Check if user owns this canvas
	if (canvas.userId !== locals.user.id) {
		error(403, 'You do not have access to this canvas');
	}

	// Load saved card positions
	const cardPositions = await getCardPositions(params.canvasId);

	return {
		user: locals.user,
		canvas,
		cardPositions
	};
};

export const actions: Actions = {
	rename: async ({ request, locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const canvas = await getCanvasById(params.canvasId);
		if (!canvas || canvas.userId !== locals.user.id) {
			return fail(403, { error: 'Access denied' });
		}

		const data = await request.formData();
		const name = data.get('name');

		if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
			return fail(400, { error: 'Canvas name must be between 1 and 100 characters' });
		}

		// Generate new slug from name
		const slug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.substring(0, 50);

		try {
			await updateCanvas(params.canvasId, { name, slug });
		} catch (err: unknown) {
			if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
				return fail(400, { error: 'A canvas with this name already exists' });
			}
			return fail(500, { error: 'Failed to rename canvas' });
		}

		return { success: true };
	},

	togglePublish: async ({ locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const canvas = await getCanvasById(params.canvasId);
		if (!canvas || canvas.userId !== locals.user.id) {
			return fail(403, { error: 'Access denied' });
		}

		try {
			await updateCanvas(params.canvasId, { isPublished: !canvas.isPublished });
		} catch (err) {
			return fail(500, { error: 'Failed to update publish status' });
		}

		return { success: true };
	},

	setEntryPoint: async ({ request, locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const canvas = await getCanvasById(params.canvasId);
		if (!canvas || canvas.userId !== locals.user.id) {
			return fail(403, { error: 'Access denied' });
		}

		const data = await request.formData();
		const noteId = data.get('noteId');

		if (typeof noteId !== 'string') {
			return fail(400, { error: 'Invalid note ID' });
		}

		try {
			await updateCanvas(params.canvasId, { entryPointNoteId: noteId || null });
		} catch (err) {
			return fail(500, { error: 'Failed to set entry point' });
		}

		return { success: true };
	}
};
