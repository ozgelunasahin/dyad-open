import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Load the site
	const { data: site, error: siteError } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published')
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

	// Load site's canvases with details
	const { data: siteCanvases } = await locals.supabase
		.from('site_canvases')
		.select(`
			canvas_id,
			position,
			canvases!inner (
				id,
				name,
				slug,
				entry_point_note_id
			)
		`)
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	const canvases = (siteCanvases ?? []).map((sc) => ({
		id: (sc.canvases as { id: string }).id,
		name: (sc.canvases as { name: string }).name,
		slug: (sc.canvases as { slug: string }).slug,
		entryPointNoteId: (sc.canvases as { entry_point_note_id: string | null }).entry_point_note_id
	}));

	// Get current canvas from URL or default to first
	const canvasParam = url.searchParams.get('canvas');
	const currentCanvas = canvasParam
		? canvases.find((c) => c.slug === canvasParam)
		: canvases[0];

	// Load full canvas data if we have a current canvas
	let vault = null;
	let cardPositions: Array<{
		id: string;
		noteId: string;
		x: number;
		y: number;
		width: number;
		height: number;
		parentCardId: string | null;
		sourceLinkX: number | null;
		sourceLinkY: number | null;
	}> = [];

	if (currentCanvas) {
		// Load saved card positions
		const { data: rawPositions } = await locals.supabase
			.from('card_positions')
			.select('id, note_id, x, y, width, height, parent_card_id, source_link_x, source_link_y')
			.eq('canvas_id', currentCanvas.id);

		cardPositions = (rawPositions ?? []).map((pos) => ({
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

		// Load notes for this canvas
		const { data: notes } = await locals.supabase
			.from('notes')
			.select('slug, title, content, wikilinks, canvas_id')
			.eq('canvas_id', currentCanvas.id);

		// Build vault object for the canvas store
		vault = {
			entryPoint: currentCanvas.entryPointNoteId || (notes?.[0]?.slug ?? ''),
			notes: Object.fromEntries(
				(notes ?? []).map((n) => [
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
	}

	// Load site pages (hero, contact, etc.)
	const { data: sitePages } = await locals.supabase
		.from('site_pages')
		.select('id, page_type, title, config, position')
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	// Build unified sections list
	type Section =
		| { type: 'canvas'; slug: string; name: string; position: number }
		| { type: 'hero' | 'contact'; id: string; title: string; config: Record<string, unknown>; position: number };

	const sections: Section[] = [
		...canvases.map((c, i) => ({
			type: 'canvas' as const,
			slug: c.slug,
			name: c.name,
			position: (siteCanvases ?? [])[i]?.position ?? i + 1
		})),
		...(sitePages ?? []).map((p) => ({
			type: p.page_type as 'hero' | 'contact',
			id: p.id,
			title: p.title,
			config: p.config as Record<string, unknown>,
			position: p.position
		}))
	];
	sections.sort((a, b) => a.position - b.position);

	return {
		user: locals.user,
		username: profile?.username ?? '',
		site,
		sections,
		canvases,
		currentCanvas: currentCanvas ?? null,
		vault,
		cardPositions
	};
};
