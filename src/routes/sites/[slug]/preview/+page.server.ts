import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const { data: site, error: siteError } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published')
		.eq('slug', params.slug)
		.eq('user_id', locals.user.id)
		.single();

	if (siteError || !site) {
		error(404, 'Site not found');
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	// Load canvases
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

	const canvases = (siteCanvases ?? []).map((sc) => {
		const c = sc.canvases as unknown as { id: string; name: string; slug: string; entry_point_note_id: string | null };
		return {
			id: c.id,
			name: c.name,
			slug: c.slug,
			entryPointNoteId: c.entry_point_note_id,
			position: sc.position
		};
	});

	// Load pages
	const { data: sitePages } = await locals.supabase
		.from('site_pages')
		.select('id, page_type, title, config, position')
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	// Build unified nav items
	type NavSection = {
		type: 'canvas' | 'page' | 'hero' | 'contact';
		slug: string;
		name: string;
		position: number;
		canvasId?: string;
		config?: Record<string, unknown>;
	};

	const navItems: NavSection[] = [
		...canvases.map((c) => ({
			type: 'canvas' as const,
			slug: c.slug,
			name: c.name,
			position: c.position,
			canvasId: c.id
		})),
		...(sitePages ?? []).map((p) => ({
			type: p.page_type as 'page' | 'hero' | 'contact',
			slug: p.id,
			name: p.title || p.page_type,
			position: p.position,
			config: p.config as Record<string, unknown>
		}))
	];
	navItems.sort((a, b) => a.position - b.position);

	// Resolve current section
	const sectionParam = url.searchParams.get('section');
	const currentNav = sectionParam
		? navItems.find((s) => s.slug === sectionParam) ?? navItems[0]
		: navItems[0];

	// Load canvas data if current section is a canvas
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

	const currentCanvas = currentNav?.type === 'canvas'
		? canvases.find((c) => c.slug === currentNav.slug)
		: null;

	if (currentCanvas) {
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

		const { data: notes } = await locals.supabase
			.from('notes')
			.select('slug, title, content, wikilinks, canvas_id')
			.eq('canvas_id', currentCanvas.id);

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

	// Page data if current section is a page
	let currentPage: { type: string; config: Record<string, unknown> } | null = null;
	if (currentNav && currentNav.type !== 'canvas') {
		currentPage = { type: currentNav.type, config: currentNav.config ?? {} };
	}

	return {
		user: locals.user,
		username: profile?.username ?? '',
		site,
		navItems: navItems.map((n) => ({ type: n.type, slug: n.slug, name: n.name })),
		currentSection: currentNav?.slug ?? null,
		currentCanvas: currentCanvas ?? null,
		currentPage,
		vault,
		cardPositions
	};
};
