import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Check if user has sites feature enabled
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('can_publish_sites, username')
		.eq('id', locals.user.id)
		.single();

	if (!profile?.can_publish_sites) {
		redirect(302, '/dashboard');
	}

	// Load user's sites with canvas counts
	const { data: sites, error } = await locals.supabase
		.from('sites')
		.select(`
			id,
			name,
			slug,
			is_published,
			created_at,
			updated_at,
			site_canvases (count)
		`)
		.eq('user_id', locals.user.id)
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load sites:', error);
	}

	// Transform to include canvas count
	const sitesWithCounts = (sites ?? []).map((site) => ({
		id: site.id,
		name: site.name,
		slug: site.slug,
		is_published: site.is_published,
		created_at: site.created_at,
		updated_at: site.updated_at,
		canvas_count: Array.isArray(site.site_canvases)
			? site.site_canvases.length
			: (site.site_canvases as { count: number })?.count ?? 0
	}));

	return {
		user: locals.user,
		username: profile.username,
		sites: sitesWithCounts
	};
};
