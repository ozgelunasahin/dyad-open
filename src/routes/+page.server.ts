import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Landing page site configuration
const LANDING_USERNAME = 'digit';
const LANDING_SITE_SLUG = 'dyad';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Logged-in users go to their canvas/dashboard
	if (locals.user) {
		const { data: canvases } = await locals.supabase
			.from('canvases')
			.select('id')
			.order('updated_at', { ascending: false })
			.limit(1);

		if (canvases && canvases.length > 0) {
			redirect(302, `/canvas/${canvases[0].id}`);
		}
		redirect(302, '/dashboard');
	}

	// Non-logged-in users see the landing page
	// Load the designated site's canvases for navigation
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, username')
		.eq('username', LANDING_USERNAME)
		.single();

	if (!profile) {
		return { site: null, siteCanvases: [], currentCanvas: null, canvasUrl: null, author: null };
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id, name, slug')
		.eq('user_id', profile.id)
		.eq('slug', LANDING_SITE_SLUG)
		.eq('is_published', true)
		.single();

	if (!site) {
		return { site: null, sections: [], siteCanvases: [], currentCanvas: null, canvasUrl: null, author: null };
	}

	// Load site pages (hero, contact, etc.)
	const { data: sitePages } = await locals.supabase
		.from('site_pages')
		.select('id, page_type, title, config, position')
		.eq('site_id', site.id)
		.order('position', { ascending: true });

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
		const c = sc.canvases as unknown as { name: string; slug: string };
		return { name: c.name, slug: c.slug, position: sc.position };
	});

	// Support canvas switching via ?canvas= query param
	const requestedCanvas = url.searchParams.get('canvas');
	const currentCanvas = canvases.find((c) => c.slug === requestedCanvas) ?? canvases[0];

	// Build unified section list sorted by position
	type Section =
		| { type: 'canvas'; slug: string; name: string; position: number }
		| { type: 'hero' | 'contact'; id: string; title: string; config: Record<string, unknown>; position: number };

	const sections: Section[] = [
		...canvases.map((c) => ({ type: 'canvas' as const, slug: c.slug, name: c.name, position: c.position })),
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
		site: { id: site.id, name: site.name, slug: site.slug },
		sections,
		siteCanvases: canvases,
		currentCanvas: currentCanvas?.slug ?? null,
		canvasUrl: currentCanvas ? `/@${LANDING_USERNAME}/${currentCanvas.slug}?readonly=true` : null,
		author: LANDING_USERNAME
	};
};
