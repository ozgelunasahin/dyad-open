import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

/**
 * POST-only logout. A GET hits the +page.svelte with a manual sign-out button;
 * cross-origin `<img src="/logout">` or prefetch can no longer sign the user
 * out by accident (was a CSRF hazard when /logout was a GET `load` action).
 */
export const actions: Actions = {
	default: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		redirect(303, '/');
	}
};
