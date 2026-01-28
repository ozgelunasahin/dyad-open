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
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, username')
		.eq('username', LANDING_USERNAME)
		.single();

	if (!profile) {
		return { site: null, navItems: [], currentSection: null, canvasUrl: null, currentPage: null, author: null };
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id, name, slug')
		.eq('user_id', profile.id)
		.eq('slug', LANDING_SITE_SLUG)
		.eq('is_published', true)
		.single();

	if (!site) {
		return { site: null, navItems: [], currentSection: null, canvasUrl: null, currentPage: null, author: null };
	}

	// Load site pages
	const { data: sitePages } = await locals.supabase
		.from('site_pages')
		.select('id, page_type, title, config, position')
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	// Load site canvases
	const { data: siteCanvases } = await locals.supabase
		.from('site_canvases')
		.select(`
			canvas_id,
			position,
			canvases!inner (
				id,
				name,
				slug
			)
		`)
		.eq('site_id', site.id)
		.order('position', { ascending: true });

	// Build unified nav items sorted by position
	type NavSection = {
		type: 'canvas' | 'page' | 'hero' | 'contact';
		slug: string;
		name: string;
		position: number;
		config?: Record<string, unknown>;
	};

	const navItems: NavSection[] = [
		...(siteCanvases ?? []).map((sc) => {
			const c = sc.canvases as unknown as { name: string; slug: string };
			return { type: 'canvas' as const, slug: c.slug, name: c.name, position: sc.position };
		}),
		...(sitePages ?? []).map((p) => ({
			type: p.page_type as 'page' | 'hero' | 'contact',
			slug: p.id, // pages use their ID as slug for URL
			name: p.title || p.page_type,
			position: p.position,
			config: p.config as Record<string, unknown>
		}))
	];
	navItems.sort((a, b) => a.position - b.position);

	// Resolve current section from ?section= param
	const sectionParam = url.searchParams.get('section');
	const currentSection = sectionParam
		? navItems.find((s) => s.slug === sectionParam) ?? navItems[0]
		: navItems[0];

	// Build content data based on current section type
	let canvasUrl: string | null = null;
	let currentPage: { type: string; config: Record<string, unknown> } | null = null;

	if (currentSection?.type === 'canvas') {
		canvasUrl = `/@${LANDING_USERNAME}/${currentSection.slug}?readonly=true`;
	} else if (currentSection) {
		currentPage = { type: currentSection.type, config: currentSection.config ?? {} };
	}

	return {
		site: { id: site.id, name: site.name, slug: site.slug },
		navItems: navItems.map((n) => ({ type: n.type, slug: n.slug, name: n.name })),
		currentSection: currentSection?.slug ?? null,
		canvasUrl,
		currentPage,
		author: LANDING_USERNAME
	};
};
