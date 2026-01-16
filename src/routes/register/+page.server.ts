import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createUser, createSession, getUserByEmail, getUserByUsername } from '$lib/server/db/operations';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, '/dashboard');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email');
		const username = data.get('username');
		const password = data.get('password');
		const confirmPassword = data.get('confirmPassword');

		// Validate email
		if (typeof email !== 'string' || !email.includes('@') || email.length < 5) {
			return fail(400, { email: email?.toString(), username: username?.toString(), error: 'Please enter a valid email address' });
		}

		// Validate username
		if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
			return fail(400, { email: email.toString(), username, error: 'Username must be between 3 and 30 characters' });
		}

		if (!/^[a-z0-9-]+$/.test(username.toLowerCase())) {
			return fail(400, { email: email.toString(), username, error: 'Username can only contain lowercase letters, numbers, and hyphens' });
		}

		// Validate password
		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { email: email.toString(), username, error: 'Password must be at least 8 characters' });
		}

		if (password !== confirmPassword) {
			return fail(400, { email: email.toString(), username, error: 'Passwords do not match' });
		}

		// Check if email already exists
		const existingEmail = await getUserByEmail(email);
		if (existingEmail) {
			return fail(400, { email: email.toString(), username, error: 'An account with this email already exists' });
		}

		// Check if username already exists
		const existingUsername = await getUserByUsername(username);
		if (existingUsername) {
			return fail(400, { email: email.toString(), username, error: 'This username is already taken' });
		}

		try {
			const user = await createUser(email, username, password);
			const sessionId = await createSession(user.id);

			cookies.set('session', sessionId, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 30 // 30 days
			});
		} catch (err) {
			console.error('Registration error:', err);
			return fail(500, { email: email.toString(), username, error: 'An error occurred during registration' });
		}

		redirect(302, '/dashboard');
	}
};
