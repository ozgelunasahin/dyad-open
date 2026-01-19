import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface CardPosition {
	id?: string;
	noteId: string;
	x: number;
	y: number;
	width: number;
	height: number;
	parentCardId?: string | null;
	sourceLinkX?: number | null;
	sourceLinkY?: number | null;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify ownership via RLS
	const { data: canvas } = await locals.supabase
		.from('canvases')
		.select('id')
		.eq('id', params.canvasId)
		.single();

	if (!canvas) {
		error(404, 'Canvas not found');
	}

	const { data: rawPositions } = await locals.supabase
		.from('card_positions')
		.select('id, note_id, x, y, width, height, parent_card_id, source_link_x, source_link_y')
		.eq('canvas_id', params.canvasId);

	// Transform to match SavedPosition interface
	const positions = (rawPositions ?? []).map((pos) => ({
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

	return json({ positions });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Verify ownership via RLS
	const { data: canvas } = await locals.supabase
		.from('canvases')
		.select('id')
		.eq('id', params.canvasId)
		.single();

	if (!canvas) {
		error(404, 'Canvas not found');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (
		!body ||
		typeof body !== 'object' ||
		!('positions' in body) ||
		!Array.isArray((body as { positions: unknown }).positions)
	) {
		return json({ error: 'Request must have a "positions" array' }, { status: 400 });
	}

	const positions = (body as { positions: CardPosition[] }).positions;

	// Validate each position
	for (const pos of positions) {
		if (
			typeof pos.noteId !== 'string' ||
			typeof pos.x !== 'number' ||
			typeof pos.y !== 'number' ||
			typeof pos.width !== 'number' ||
			typeof pos.height !== 'number'
		) {
			return json({ error: 'Invalid position data' }, { status: 400 });
		}
	}

	// Delete existing positions and insert new ones
	const { error: deleteError } = await locals.supabase
		.from('card_positions')
		.delete()
		.eq('canvas_id', params.canvasId);

	if (deleteError) {
		console.error('Failed to delete old positions:', deleteError);
		return json({ error: 'Failed to save positions' }, { status: 500 });
	}

	if (positions.length > 0) {
		const { error: insertError } = await locals.supabase.from('card_positions').insert(
			positions.map((pos) => ({
				canvas_id: params.canvasId,
				note_id: pos.noteId,
				x: pos.x,
				y: pos.y,
				width: pos.width,
				height: pos.height,
				parent_card_id: pos.parentCardId ?? null,
				source_link_x: pos.sourceLinkX ?? null,
				source_link_y: pos.sourceLinkY ?? null
			}))
		);

		if (insertError) {
			console.error('Failed to save positions:', insertError);
			return json({ error: 'Failed to save positions' }, { status: 500 });
		}
	}

	return json({ success: true });
};
