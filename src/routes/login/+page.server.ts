import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		redirect(302, '/dashboard');
	}
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
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email !== 'string' || email.length < 1) {
			return fail(400, { email: email?.toString(), error: 'Please enter your email' });
		}

		if (typeof password !== 'string' || password.length < 6) {
			return fail(400, { email: email.toString(), error: 'Password must be at least 6 characters' });
		}

		const { error } = await locals.supabase.auth.signUp({
			email,
			password
		});

		if (error) {
			return fail(400, { email: email.toString(), error: error.message });
		}

		return { success: true, message: 'Check your email to confirm your account' };
	},

	logout: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		redirect(302, '/login');
	}
};
