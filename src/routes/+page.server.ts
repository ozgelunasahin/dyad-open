import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is logged in, redirect to dashboard or their first canvas
	if (locals.user) {
		const { data: canvases } = await locals.supabase
			.from('canvases')
			.select('id')
			.order('updated_at', { ascending: false })
			.limit(1);

		if (canvases && canvases.length > 0) {
			// Redirect to first canvas
			redirect(302, `/canvas/${canvases[0].id}`);
		}
		// No canvases yet, go to dashboard to create one
		redirect(302, '/dashboard');
	}

	// Not logged in - show landing page
	return {};
};
