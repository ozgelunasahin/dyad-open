import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		redirect(302, '/dashboard');
	}

	const token = url.searchParams.get('token');
	if (!token) {
		redirect(302, '/');
	}

	// Validate the invitation token via RPC
	const { data, error } = await locals.supabase.rpc('validate_invitation', {
		invite_token: token
	});

	if (error || !data || data.length === 0) {
		return { valid: false, email: null, token };
	}

	const invitation = data[0];
	if (!invitation.valid) {
		return { valid: false, email: null, token };
	}

	return { valid: true, email: invitation.email, token };
};

export const actions: Actions = {
	signup: async ({ request, locals }) => {
		const formData = await request.formData();
		const token = formData.get('token');
		const username = formData.get('username');
		const email = formData.get('email');
		const password = formData.get('password');
		const berlinBased = formData.get('berlin_based') === 'on';

		if (typeof token !== 'string' || !token) {
			return fail(400, { error: 'Invalid invitation token' });
		}

		if (typeof username !== 'string' || username.length < 3) {
			return fail(400, {
				username: username?.toString(),
				error: 'Username must be at least 3 characters'
			});
		}

		if (!/^[a-z0-9_-]+$/.test(username)) {
			return fail(400, {
				username,
				error: 'Username can only contain lowercase letters, numbers, underscores, and hyphens'
			});
		}

		if (typeof email !== 'string' || email.length < 1) {
			return fail(400, { username, error: 'Email is required' });
		}

		if (typeof password !== 'string' || password.length < 6) {
			return fail(400, { username, error: 'Password must be at least 6 characters' });
		}

		// Re-validate the token
		const { data: validation } = await locals.supabase.rpc('validate_invitation', {
			invite_token: token
		});

		if (!validation || validation.length === 0 || !validation[0].valid) {
			return fail(400, { username, error: 'This invitation is no longer valid' });
		}

		// Check if username is already taken
		const { data: existingProfile } = await locals.supabase
			.from('profiles')
			.select('username')
			.eq('username', username)
			.single();

		if (existingProfile) {
			return fail(400, { username, error: 'Username is already taken' });
		}

		// Create the user account
		const { error: signUpError } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: { username, berlin_based: berlinBased }
			}
		});

		if (signUpError) {
			return fail(400, { username, error: signUpError.message });
		}

		// Mark the invitation as used and auto-confirm email (invite-only, already validated)
		await Promise.all([
			locals.supabase.rpc('use_invitation', { invite_token: token }),
			locals.supabase.rpc('confirm_user_email', { user_email: email })
		]);

		// Sign in immediately so the user doesn't have to log in again
		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (!signInError) {
			redirect(302, '/dashboard');
		}

		// Fallback if auto-sign-in fails (e.g., email confirmation required)
		return { success: true, message: 'Account created! Check your email to confirm, then sign in.' };
	}
};
