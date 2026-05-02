import { fail, redirect } from '@sveltejs/kit';
import type { Session } from '@prefig/upact';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const mode = url.searchParams.get('mode');

	// Allow update password mode even if logged in (for recovery flow)
	if (session && mode !== 'update') {
		redirect(302, '/discover');
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

		try {
			const result = await locals.identityPort.authenticate({ kind: 'password', email, password });
			if ('code' in result) {
				const message = result.code === 'rate_limited'
					? 'Too many attempts — please try again later'
					: 'Invalid email or password';
				return fail(400, { email: email.toString(), error: message });
			}
		} catch {
			return fail(503, { email: email.toString(), error: 'Service temporarily unavailable — please try again' });
		}

		redirect(302, '/discover');
	},

	logout: async ({ locals }) => {
		// Both the Supabase and OIDC adapters ignore the passed Session —
		// each reads its own cookie state to know what to clear.
		// If a future adapter requires a real Session here, thread it from authenticate().
		try {
			await locals.identityPort.invalidate({} as Session);
		} catch {
			// Fail open: redirect even if the substrate is unavailable.
			// The cookie will expire naturally; the user is effectively logged out.
		}
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
			console.error('[resetPassword]', error.message);
			return fail(400, { email: email.toString(), error: 'Unable to send reset email — please try again' });
		}

		return { success: true, message: 'Check your email for a password reset link' };
	},

	updatePassword: async ({ request, locals }) => {
		const data = await request.formData();
		const password = data.get('password');

		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		const { error } = await locals.supabase.auth.updateUser({ password });

		if (error) {
			console.error('[updatePassword]', error.message);
			return fail(400, { error: 'Unable to update password — please try again' });
		}

		redirect(302, '/discover');
	}
};
