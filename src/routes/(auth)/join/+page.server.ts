import { fail, redirect } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin.js';
import { SupabaseScopeService } from '$lib/services/scope.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		redirect(302, '/discover');
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
	signup: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		const token = formData.get('token');
		const username = formData.get('username');
		const email = formData.get('email');
		const password = formData.get('password');
		const berlinBased = formData.get('berlin_based') === 'on';

		if (typeof token !== 'string' || !token) {
			return fail(400, { username: username?.toString(), error: 'Invalid invitation token' });
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

		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { username, error: 'Password must be at least 8 characters' });
		}

		if (password.length > 128) {
			return fail(400, { username, error: 'Password must be at most 128 characters' });
		}

		// Re-validate the token and bind the account to the token-derived email.
		// The form's email input is informational only — we never trust it server-side,
		// or any leaked token could be used to create accounts under attacker-controlled emails.
		const { data: validation } = await locals.supabase.rpc('validate_invitation', {
			invite_token: token
		});

		if (!validation || validation.length === 0 || !validation[0].valid) {
			return fail(400, { username, error: 'This invitation is no longer valid' });
		}

		const validatedEmail = validation[0].email;
		if (!validatedEmail) {
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

		// Create the user account via the admin API with email_confirm: true.
		// Admin-creating with the invitation token as proof bypasses Supabase's
		// own confirmation-email flow entirely — we don't want the platform to
		// send a second "please confirm" message when our invite email already
		// served that purpose, and we don't want signUp() to fail when Supabase
		// auth has enable_confirmations enabled but no SMTP wired up for auth.
		const admin = makeAdminClient();
		const { data: createUserData, error: signUpError } = await admin.auth.admin.createUser({
			email: validatedEmail,
			password,
			email_confirm: true,
			user_metadata: { username, berlin_based: berlinBased }
		});

		if (signUpError || !createUserData?.user?.id) {
			console.error('[join] admin.createUser failed:', signUpError);
			// Surface a safe message — the raw error can leak Postgres detail.
			const msg = signUpError?.message?.toLowerCase() ?? '';
			const friendly = msg.includes('already') || msg.includes('exists')
				? 'An account with this email already exists.'
				: 'Could not create your account. Please try again.';
			return fail(400, { username, error: friendly });
		}

		// identities.id mirrors auth.users.id by the D1 backfill convention,
		// so the just-created auth user's id is the identities.id for FK targets.
		const newIdentityId = createUserData.user.id;

		// Mark the invitation as used so it can't be reused.
		const { error: useError } = await locals.supabase.rpc('use_invitation', { invite_token: token });
		if (useError) {
			console.error('[join] use_invitation failed:', useError);
			return fail(400, { username, error: 'This invitation could not be processed. Please try again.' });
		}

		// invitations RLS permits admin reads only; locals.supabase is still anon
		// at this point (sign-in happens below).
		let referredById: string | null = null;

		const { data: invRow } = await admin
			.from('invitations')
			.select('invited_by, scope')
			.eq('token', token)
			.single();
		if (invRow?.invited_by) {
			referredById = invRow.invited_by;
		}

		if (invRow?.scope) {
			try {
				const scopeService = new SupabaseScopeService(admin);
				await scopeService.autoGrantOnJoin({
					identityId: newIdentityId,
					scope: invRow.scope,
					grantedBy: invRow.invited_by ?? null
				});
			} catch (grantError) {
				console.error(
					'[join] auto-grant identity_scopes failed:',
					grantError instanceof Error ? grantError.message : String(grantError)
				);
			}
		}

		// 2. Fall back to dyad_ref cookie (username → resolve to user id)
		if (!referredById) {
			const refUsername = cookies.get('dyad_ref');
			if (refUsername) {
				const { data: refProfile } = await locals.supabase
					.from('profiles')
					.select('id')
					.eq('username', refUsername)
					.single();
				if (refProfile) referredById = refProfile.id;
			}
		}

		// Sign in immediately so we can update the profile
		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email: validatedEmail,
			password
		});

		// Set referred_by on the new user's profile (look up by username since we just signed in)
		if (referredById) {
			await locals.supabase
				.from('profiles')
				.update({ referred_by: referredById })
				.eq('username', username as string);
		}

		if (!signInError) {
			redirect(302, '/discover?welcome=1');
		}

		// Fallback if auto-sign-in fails (e.g., email confirmation required)
		return { success: true, message: 'Account created! Check your email to confirm, then sign in.' };
	}
};
