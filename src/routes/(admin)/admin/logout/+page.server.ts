import { redirect } from '@sveltejs/kit';
import { createAdminSupabaseClient } from '$lib/server/admin-supabase';
import type { Actions } from './$types';

/**
 * POST-only admin logout. Signs out of the admin Supabase session
 * (sb-admin-* cookies). The user-tier session, if any, is unaffected.
 */
export const actions: Actions = {
	default: async ({ cookies }) => {
		const adminSupabase = createAdminSupabaseClient(cookies);
		try {
			await adminSupabase.auth.signOut();
		} catch {
			// Fail open: cookies are cleared by signOut on success; on failure
			// the user is redirected to /admin/login which redirects them again
			// after the next request loop.
		}
		redirect(303, '/admin/login');
	}
};
