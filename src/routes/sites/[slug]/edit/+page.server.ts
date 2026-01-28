import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Load the site
	const { data: site, error: siteError } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published, created_at, updated_at')
		.eq('slug', params.slug)
		.eq('user_id', locals.user.id)
		.single();

	if (siteError || !site) {
		error(404, 'Site not found');
	}

	// Load user's profile for username
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	// Load all user's canvases (for the "add canvas" picker)
	const { data: allCanvases } = await locals.supabase
		.from('canvases')
		.select('id, name, slug')
		.eq('user_id', locals.user.id)
		.order('updated_at', { ascending: false });

	// Load site's canvas sections (may have duplicates of same canvas with different labels)
	const { data: siteCanvases } = await locals.supabase
		.from('site_canvases')
		.select(`
			id,
			canvas_id,
			position,
			nav_label,
			nav_note_id,
			canvases!inner (
				id,
				name,
				slug
			)
		`)
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	// Build canvas section list (each row is a separate section)
	const canvasSections = (siteCanvases ?? []).map((sc) => {
		const c = sc.canvases as unknown as { id: string; name: string; slug: string };
		return {
			id: sc.id as string,
			canvasId: c.id,
			canvasName: c.name,
			canvasSlug: c.slug,
			position: sc.position as number,
			navLabel: sc.nav_label as string | null,
			navNoteId: sc.nav_note_id as string | null
		};
	});

	// Load notes for all canvases used in sections (for the nav target picker)
	const canvasIds = [...new Set(canvasSections.map((s) => s.canvasId))];
	let canvasNotes: Record<string, Array<{ slug: string; title: string }>> = {};
	if (canvasIds.length > 0) {
		const { data: notes } = await locals.supabase
			.from('notes')
			.select('slug, title, canvas_id')
			.in('canvas_id', canvasIds);
		for (const note of notes ?? []) {
			const list = canvasNotes[note.canvas_id] ?? [];
			list.push({ slug: note.slug, title: note.title });
			canvasNotes[note.canvas_id] = list;
		}
	}

	// Load site pages (hero, contact, etc.)
	const { data: sitePages } = await locals.supabase
		.from('site_pages')
		.select('id, page_type, title, config, position')
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	return {
		user: locals.user,
		username: profile?.username ?? '',
		site,
		availableCanvases: (allCanvases ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
		canvasSections,
		canvasNotes,
		sitePages: sitePages ?? []
	};
};
