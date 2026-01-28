import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildLandingCanvasData } from '$lib/server/load-site-sections';

const LANDING_USERNAME = 'digit';
const LANDING_SITE_SLUG = 'dyad';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
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
		return { site: null, navItems: [], vault: null, savedPositions: [], entryPointMap: {}, author: null };
	}

	const { data: site } = await locals.supabase
		.from('sites')
		.select('id, name, slug')
		.eq('user_id', profile.id)
		.eq('slug', LANDING_SITE_SLUG)
		.eq('is_published', true)
		.single();

	if (!site) {
		return { site: null, navItems: [], vault: null, savedPositions: [], entryPointMap: {}, author: null };
	}

	const { vault, savedPositions, navItems, entryPointMap } = await buildLandingCanvasData(locals.supabase, site.id);

	// Cache for anonymous users — identical for everyone
	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
	});

	return {
		site: { id: site.id, name: site.name, slug: site.slug },
		navItems,
		vault,
		savedPositions,
		entryPointMap,
		author: LANDING_USERNAME
	};
};
