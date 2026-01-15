import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCanvasById, saveCardPositions, getCardPositions } from '$lib/server/db/operations';
import type { NewCardPosition } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const canvas = await getCanvasById(params.canvasId);
	if (!canvas) {
		error(404, 'Canvas not found');
	}

	// Check ownership
	if (canvas.userId !== locals.user.id) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const positions = await getCardPositions(params.canvasId);
	return json({ positions });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const canvas = await getCanvasById(params.canvasId);
	if (!canvas) {
		error(404, 'Canvas not found');
	}

	// Check ownership
	if (canvas.userId !== locals.user.id) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (!body || typeof body !== 'object' || !('positions' in body) || !Array.isArray((body as { positions: unknown }).positions)) {
		return json({ error: 'Request must have a "positions" array' }, { status: 400 });
	}

	const positions = (body as { positions: NewCardPosition[] }).positions;

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

	try {
		await saveCardPositions(params.canvasId, positions);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to save positions:', err);
		return json({ error: 'Failed to save positions' }, { status: 500 });
	}
};
