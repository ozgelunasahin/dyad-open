import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const { data: canvas, error: canvasError } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, is_published, entry_point_note_id, created_at, updated_at')
		.eq('id', params.canvasId)
		.single();

	if (canvasError || !canvas) {
		error(404, 'Canvas not found');
	}

	// Load saved card positions
	const { data: rawPositions } = await locals.supabase
		.from('card_positions')
		.select('id, note_id, x, y, width, height, parent_card_id, source_link_x, source_link_y')
		.eq('canvas_id', params.canvasId);

	// Transform to match SavedPosition interface
	const cardPositions = (rawPositions ?? []).map((pos) => ({
		id: pos.id,
		noteId: pos.note_id,
		x: pos.x,
		y: pos.y,
		width: pos.width,
		height: pos.height,
		parentCardId: pos.parent_card_id ?? null,
		sourceLinkX: pos.source_link_x ?? null,
		sourceLinkY: pos.source_link_y ?? null
	}));

	// Load user's notes from Supabase (RLS filters to user's own notes)
	const { data: notes } = await locals.supabase
		.from('notes')
		.select('slug, title, content, wikilinks');

	// Build vault object for the canvas store
	// Entry point: use canvas setting, or first note, or empty string (handled by store)
	const vault = {
		entryPoint: canvas.entry_point_note_id || (notes?.[0]?.slug ?? ''),
		notes: Object.fromEntries(
			(notes ?? []).map((n) => [
				n.slug,
				{
					id: n.slug,
					title: n.title,
					content: n.content,
					wikilinks: n.wikilinks ?? []
				}
			])
		)
	};

	return {
		user: locals.user,
		canvas,
		cardPositions,
		vault
	};
};

export const actions: Actions = {
	rename: async ({ request, locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		// RLS ensures user can only update their own canvases
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

		const { error: updateError } = await locals.supabase
			.from('canvases')
			.update({ name, slug, updated_at: new Date().toISOString() })
			.eq('id', params.canvasId);

		if (updateError) {
			if (updateError.code === '23505') {
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

		// Get current state
		const { data: canvas } = await locals.supabase
			.from('canvases')
			.select('is_published')
			.eq('id', params.canvasId)
			.single();

		if (!canvas) {
			return fail(404, { error: 'Canvas not found' });
		}

		const { error: updateError } = await locals.supabase
			.from('canvases')
			.update({ is_published: !canvas.is_published, updated_at: new Date().toISOString() })
			.eq('id', params.canvasId);

		if (updateError) {
			return fail(500, { error: 'Failed to update publish status' });
		}

		return { success: true };
	},

	setEntryPoint: async ({ request, locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const noteId = data.get('noteId');

		if (typeof noteId !== 'string') {
			return fail(400, { error: 'Invalid note ID' });
		}

		const { error: updateError } = await locals.supabase
			.from('canvases')
			.update({
				entry_point_note_id: noteId || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', params.canvasId);

		if (updateError) {
			return fail(500, { error: 'Failed to set entry point' });
		}

		return { success: true };
	}
};
