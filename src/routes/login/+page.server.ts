import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const mode = url.searchParams.get('mode');

	// Allow update password mode even if logged in (for recovery flow)
	if (session && mode !== 'update') {
		redirect(302, '/dashboard');
	}

	return { mode };
};

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email !== 'string' || email.length < 1) {
			return fail(400, { email: email?.toString(), error: 'Please enter your email' });
		}

		if (typeof password !== 'string' || password.length < 1) {
			return fail(400, { email: email.toString(), error: 'Please enter your password' });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(400, { email: email.toString(), error: error.message });
		}

		redirect(302, '/dashboard');
	},

	signup: async ({ request, locals }) => {
		const data = await request.formData();
		const username = data.get('username');
		const email = data.get('email');
		const password = data.get('password');

		if (typeof username !== 'string' || username.length < 3) {
			return fail(400, { username: username?.toString(), email: email?.toString(), error: 'Username must be at least 3 characters' });
		}

		// Validate username format
		if (!/^[a-z0-9_-]+$/.test(username)) {
			return fail(400, { username, email: email?.toString(), error: 'Username can only contain lowercase letters, numbers, underscores, and hyphens' });
		}

		if (typeof email !== 'string' || email.length < 1) {
			return fail(400, { username, email: email?.toString(), error: 'Please enter your email' });
		}

		if (typeof password !== 'string' || password.length < 6) {
			return fail(400, { username, email: email.toString(), error: 'Password must be at least 6 characters' });
		}

		// Check if username is already taken
		const { data: existingProfile } = await locals.supabase
			.from('profiles')
			.select('username')
			.eq('username', username)
			.single();

		if (existingProfile) {
			return fail(400, { username, email: email.toString(), error: 'Username is already taken' });
		}

		const { error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: { username }
			}
		});

		if (error) {
			return fail(400, { username, email: email.toString(), error: error.message });
		}

		return { success: true, message: 'Check your email to confirm your account' };
	},

	logout: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		redirect(302, '/login');
	},

	resetPassword: async ({ request, locals, url }) => {
		const data = await request.formData();
		const email = data.get('email');

		if (typeof email !== 'string' || email.length < 1) {
			return fail(400, { email: email?.toString(), error: 'Please enter your email' });
		}

		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/auth/callback?type=recovery`
		});

		if (error) {
			return fail(400, { email: email.toString(), error: error.message });
		}

		return { success: true, message: 'Check your email for a password reset link' };
	},

	updatePassword: async ({ request, locals }) => {
		const data = await request.formData();
		const password = data.get('password');

		if (typeof password !== 'string' || password.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters' });
		}

		const { error } = await locals.supabase.auth.updateUser({ password });

		if (error) {
			return fail(400, { error: error.message });
		}

		redirect(302, '/dashboard');
	}
};
