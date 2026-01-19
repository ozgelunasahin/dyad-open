import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Get the published canvas with author info
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
		.eq('slug', params.canvasSlug)
		.eq('is_published', true)
		.single();

	if (canvasError || !canvas) {
		error(404, 'Canvas not found');
	}

	// Load saved card positions
	const { data: rawPositions } = await locals.supabase
		.from('card_positions')
		.select('id, note_id, x, y, width, height, parent_card_id, source_link_x, source_link_y')
		.eq('canvas_id', canvas.id);

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
		cardPositions,
		readOnly: true
	};
};
