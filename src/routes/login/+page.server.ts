import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createSession,
	getUserByEmail,
	verifyPassword,
	updateLastLogin
} from '$lib/server/db/operations';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/dashboard');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (typeof email !== 'string' || !email.includes('@')) {
			return fail(400, { email: email?.toString(), error: 'Please enter a valid email address' });
		}

		if (typeof password !== 'string' || password.length < 1) {
			return fail(400, { email: email.toString(), error: 'Please enter your password' });
		}

		const user = await getUserByEmail(email);
		if (!user) {
			return fail(400, { email: email.toString(), error: 'Invalid email or password' });
		}

		const validPassword = await verifyPassword(password, user.passwordHash);
		if (!validPassword) {
			return fail(400, { email: email.toString(), error: 'Invalid email or password' });
		}

		try {
			const sessionId = await createSession(user.id);
			await updateLastLogin(user.id);

			cookies.set('session', sessionId, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 30 // 30 days
			});
		} catch (err) {
			console.error('Login error:', err);
			return fail(500, { email: email.toString(), error: 'An error occurred during login' });
		}

		redirect(302, '/dashboard');
	}
};
