import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// List all notes for current user
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// RLS automatically filters to user's notes
	const { data: notes, error } = await locals.supabase
		.from('notes')
		.select('slug, title, content, wikilinks')
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load notes:', error);
		return json({ error: 'Failed to load notes' }, { status: 500 });
	}

	return json(notes ?? []);
};
