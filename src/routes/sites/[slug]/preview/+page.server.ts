import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { buildLandingCanvasData } from '$lib/server/load-site-sections';

export const load: PageServerLoad = async ({ locals, params }) => {
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

	const { vault, savedPositions, navItems, entryPointMap } = await buildLandingCanvasData(locals.supabase, site.id);

	return {
		user: locals.user,
		username: profile?.username ?? '',
		site,
		navItems,
		vault,
		savedPositions,
		entryPointMap
	};
};
