import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// List all notes for a canvas
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const canvasId = url.searchParams.get('canvas_id');
	if (!canvasId) {
		return json({ error: 'canvas_id parameter is required' }, { status: 400 });
	}

	// RLS automatically filters to user's notes, we filter by canvas
	const { data: notes, error } = await locals.supabase
		.from('notes')
		.select('slug, title, content, wikilinks, canvas_id')
		.eq('canvas_id', canvasId)
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load notes:', error);
		return json({ error: 'Failed to load notes' }, { status: 500 });
	}

	return json(notes ?? []);
};
