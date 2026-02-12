import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Only serve canvases that are in landing_highlights (curated content)
	const { data: highlight } = await locals.supabase
		.from('landing_highlights')
		.select('canvas_id')
		.not('canvas_id', 'is', null)
		.limit(100);

	if (!highlight || highlight.length === 0) {
		error(404, 'Essay not found');
	}

	const highlightedCanvasIds = highlight.map(h => h.canvas_id);

	// Find the canvas by slug among highlighted canvases
	const { data: canvas } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, entry_point_note_id')
		.eq('slug', params.slug)
		.in('id', highlightedCanvasIds)
		.single();

	if (!canvas) {
		error(404, 'Essay not found');
	}

	// Load notes and card positions
	const [notesResult, positionsResult] = await Promise.all([
		locals.supabase
			.from('notes')
			.select('slug, title, content, wikilinks, canvas_id')
			.eq('canvas_id', canvas.id),
		locals.supabase
			.from('card_positions')
			.select('id, note_id, x, y, width, height, parent_card_id, source_link_x, source_link_y')
			.eq('canvas_id', canvas.id)
	]);

	const vault = {
		entryPoint: canvas.entry_point_note_id || (notesResult.data?.[0]?.slug ?? ''),
		notes: Object.fromEntries(
			(notesResult.data ?? []).map((n) => [
				n.slug,
				{
					id: n.slug,
					canvasId: n.canvas_id,
					title: n.title,
					content: n.content,
					wikilinks: n.wikilinks ?? []
				}
			])
		)
	};

	const cardPositions = (positionsResult.data ?? []).map((pos) => ({
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
		cardPositions,
		vault,
		readOnly: true
	};
};
