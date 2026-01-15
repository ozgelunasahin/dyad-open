import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createSession,
	getUserByEmail,
	getUserByUsername,
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
		const identifier = data.get('identifier');
		const password = data.get('password');

		if (typeof identifier !== 'string' || identifier.length < 1) {
			return fail(400, { identifier: identifier?.toString(), error: 'Please enter your email or username' });
		}

		if (typeof password !== 'string' || password.length < 1) {
			return fail(400, { identifier: identifier.toString(), error: 'Please enter your password' });
		}

		// Check if identifier is email (contains @) or username
		const isEmail = identifier.includes('@');
		const user = isEmail
			? await getUserByEmail(identifier)
			: await getUserByUsername(identifier.toLowerCase());

		if (!user) {
			return fail(400, { identifier: identifier.toString(), error: 'Invalid email/username or password' });
		}

		const validPassword = await verifyPassword(password, user.passwordHash);
		if (!validPassword) {
			return fail(400, { identifier: identifier.toString(), error: 'Invalid email/username or password' });
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
			return fail(500, { identifier: identifier.toString(), error: 'An error occurred during login' });
		}

		redirect(302, '/dashboard');
	}
};
