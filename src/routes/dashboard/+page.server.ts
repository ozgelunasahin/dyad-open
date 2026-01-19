import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { nanoid } from 'nanoid';
import { STARTER_NOTES, STARTER_ENTRY_POINT } from '$lib/starter-notes';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const userId = locals.user.id;

	// Load user's canvases, profile, and published canvases from others in parallel
	const [canvasesResult, profileResult, publishedCanvasesResult] = await Promise.all([
		locals.supabase
			.from('canvases')
			.select('id, name, slug, is_published, entry_point_note_id, created_at, updated_at')
			.eq('user_id', userId)
			.order('updated_at', { ascending: false }),
		locals.supabase
			.from('profiles')
			.select('onboarded, username')
			.eq('id', userId)
			.single(),
		locals.supabase
			.from('canvases')
			.select('id, name, slug, user_id, updated_at')
			.eq('is_published', true)
			.neq('user_id', userId)
			.order('updated_at', { ascending: false })
			.limit(20)
	]);

	// Fetch usernames for published canvases (separate query since no direct FK)
	let publishedCanvases: Array<{
		id: string;
		name: string;
		slug: string;
		user_id: string;
		username: string;
		updated_at: string;
	}> = [];

	if (publishedCanvasesResult.data && publishedCanvasesResult.data.length > 0) {
		const userIds = [...new Set(publishedCanvasesResult.data.map((c) => c.user_id))];
		const { data: profiles } = await locals.supabase
			.from('profiles')
			.select('id, username')
			.in('id', userIds);

		const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) ?? []);
		publishedCanvases = publishedCanvasesResult.data.map((canvas) => ({
			...canvas,
			username: usernameMap.get(canvas.user_id) ?? 'unknown'
		}));
	}

	if (canvasesResult.error) {
		console.error('Failed to load canvases:', canvasesResult.error);
	}

	const canvases = canvasesResult.data;
	const isOnboarded = profileResult.data?.onboarded ?? false;
	const username = profileResult.data?.username ?? '';

	// Seed starter canvas for new users who haven't been onboarded yet
	// This only runs once per account - deleting the canvas won't recreate it
	if ((!canvases || canvases.length === 0) && !isOnboarded) {
		const canvasId = nanoid();

		// Create starter canvas FIRST (notes have FK to canvas)
		const { error: canvasError } = await locals.supabase.from('canvases').insert({
			id: canvasId,
			user_id: userId,
			name: 'Getting Started',
			slug: 'getting-started',
			entry_point_note_id: STARTER_ENTRY_POINT
		});

		if (canvasError) {
			console.error('Failed to create starter canvas:', canvasError);
		}

		// Insert starter notes (canvas-scoped, after canvas exists)
		const notesToInsert = STARTER_NOTES.map((note) => ({
			canvas_id: canvasId,
			user_id: userId,
			slug: note.slug,
			title: note.title,
			content: note.content,
			wikilinks: note.wikilinks
		}));

		const { error: notesError } = await locals.supabase.from('notes').insert(notesToInsert);

		if (notesError) {
			console.error('Failed to seed starter notes:', notesError);
		}

		// Mark user as onboarded
		await locals.supabase
			.from('profiles')
			.update({ onboarded: true })
			.eq('id', userId);

		// Return the new canvas in the list (re-fetch to get accurate data)
		const { data: newCanvases } = await locals.supabase
			.from('canvases')
			.select('id, name, slug, is_published, entry_point_note_id, created_at, updated_at')
			.eq('user_id', userId)
			.order('updated_at', { ascending: false });

		return {
			user: locals.user,
			username,
			canvases: newCanvases ?? [],
			publishedCanvases
		};
	}

	return {
		user: locals.user,
		username,
		canvases: canvases ?? [],
		publishedCanvases
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
