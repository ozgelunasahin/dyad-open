import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserCanvases } from '$lib/server/db/operations';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is logged in, redirect to dashboard or their first canvas
	if (locals.user) {
		const canvases = await getUserCanvases(locals.user.id);
		if (canvases.length > 0) {
			// Redirect to first canvas
			redirect(302, `/canvas/${canvases[0].id}`);
		}
		// No canvases yet, go to dashboard to create one
		redirect(302, '/dashboard');
	}

	// Not logged in - show landing page
	return {};
};
