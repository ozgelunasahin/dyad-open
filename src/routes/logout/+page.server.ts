import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	redirect(302, '/');
};

// POST form sign-out (e.g. the profile page form) — without this, POSTing to
// /logout returns 405. Kept alongside `load` so the sidebar's link still works.
export const actions: Actions = {
	default: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		redirect(302, '/');
	}
};
