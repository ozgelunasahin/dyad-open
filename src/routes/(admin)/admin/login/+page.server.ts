import { fail, redirect } from '@sveltejs/kit';
import { createAdminSupabaseClient } from '$lib/server/admin-supabase';
import { isAdminAuthorized } from '$lib/server/admin-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// If already authenticated as an admin, skip the login form.
	const adminSupabase = createAdminSupabaseClient(cookies);
	const { data } = await adminSupabase.auth.getUser();
	if (data.user && isAdminAuthorized(data.user)) {
		redirect(302, '/admin/waitlist');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email !== 'string' || email.length < 1) {
			return fail(400, { email: email?.toString(), error: 'Please enter your email' });
		}
		if (typeof password !== 'string' || password.length < 1) {
			return fail(400, { email: email.toString(), error: 'Please enter your password' });
		}

		const adminSupabase = createAdminSupabaseClient(cookies);

		// Step 1: authenticate via Supabase. This sets the sb-admin-* cookies on success.
		const { data: authData, error } = await adminSupabase.auth.signInWithPassword({ email, password });
		if (error || !authData.user) {
			return fail(400, { email: email.toString(), error: 'Invalid email or password' });
		}

		// Step 2: confirm this user is authorized for the admin plane. Authentication
		// alone is not sufficient — admin authorization requires app_metadata.admin_authorized
		// (set by the Supabase Admin API; immutable from the client side).
		if (!isAdminAuthorized(authData.user)) {
			// Sign out immediately to discard the admin session — the cookies were set
			// by signInWithPassword above. We do not want a non-admin to hold an admin
			// cookie even briefly after this response returns.
			await adminSupabase.auth.signOut();
			return fail(403, { email: email.toString(), error: 'Not authorized for the admin plane' });
		}

		redirect(302, '/admin/waitlist');
	}
};
