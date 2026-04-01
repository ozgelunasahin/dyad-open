import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

function makeAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		redirect(302, '/discover');
	}

	const ref = url.searchParams.get('ref') ?? null;

	if (!ref) {
		redirect(302, '/');
	}

	// Validate ref using admin client — anon role can't read profiles
	const { data: profile } = await makeAdminClient()
		.from('profiles')
		.select('id')
		.eq('username', ref)
		.maybeSingle();

	if (!profile) {
		redirect(302, '/');
	}

	const email = url.searchParams.get('email') ?? null;
	const motivation = url.searchParams.get('motivation') ?? null;

	return { ref, email, motivation };
};

export const actions: Actions = {
	signup: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const username = formData.get('username');
		const password = formData.get('password');
		const ref = formData.get('ref');
		const motivation = formData.get('motivation');
		const berlinBased = formData.get('berlin_based') === 'on';

		if (typeof email !== 'string' || email.length < 1) {
			return fail(400, { username: username?.toString(), error: 'Email is required' });
		}

		if (typeof username !== 'string' || username.length < 3) {
			return fail(400, { username: username?.toString(), error: 'Username must be at least 3 characters' });
		}

		if (!/^[a-z0-9_-]+$/.test(username)) {
			return fail(400, { username, error: 'Username can only contain lowercase letters, numbers, underscores, and hyphens' });
		}

		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { username, error: 'Password must be at least 8 characters' });
		}

		if (password.length > 128) {
			return fail(400, { username, error: 'Password must be at most 128 characters' });
		}

		const admin = makeAdminClient();

		// Check username availability — anon can't read profiles, use admin
		const { data: existingProfile } = await admin
			.from('profiles')
			.select('username')
			.eq('username', username)
			.maybeSingle();

		if (existingProfile) {
			return fail(400, { username, error: 'Username is already taken' });
		}

		// Resolve ref username → UUID so the trigger can write referred_by directly
		let referredById: string | null = null;
		const refUsername = (typeof ref === 'string' && ref) || cookies.get('dyad_ref') || null;
		if (refUsername) {
			const { data: refProfile } = await admin
				.from('profiles')
				.select('id')
				.eq('username', refUsername)
				.maybeSingle();
			referredById = refProfile?.id ?? null;
		}

		const joinMotivation = (typeof motivation === 'string' && motivation.trim()) || null;

		// Normal signUp — Supabase sends the confirmation email automatically.
		// referred_by (UUID) and join_motivation are stored in user_metadata so
		// the handle_new_user trigger writes them to profiles on row creation.
		const { data: signUpData, error: signUpError } = await locals.supabase.auth.signUp({
			email: email.trim(),
			password,
			options: {
				data: {
					username,
					berlin_based: berlinBased,
					join_motivation: joinMotivation,
					referred_by: referredById
				}
			}
		});

		if (signUpError) {
			const msg = signUpError.message;
			return fail(400, {
				username,
				error: msg.includes('already registered') ? 'An account with this email already exists.' : msg
			});
		}

		// Capture signup event server-side
		const { env } = await import('$env/dynamic/public');
		if (env.PUBLIC_POSTHOG_KEY && signUpData.user) {
			fetch('https://eu.i.posthog.com/capture/', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					api_key: env.PUBLIC_POSTHOG_KEY,
					distinct_id: signUpData.user.id,
					event: 'referral_signup_completed',
					properties: {
						referred_by: refUsername ?? null,
						has_motivation: !!joinMotivation,
						motivation: joinMotivation
					}
				})
			}).catch(() => {});
		}

		// Local dev (enable_confirmations = false): session is returned immediately
		if (signUpData.session) {
			redirect(302, '/discover?welcome=1');
		}

		// Production: confirmation email sent — show OTP entry step
		return { checkEmail: true, email: email.trim() };
	},

	verify: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const token = formData.get('token');

		if (typeof email !== 'string' || typeof token !== 'string' || token.length !== 6) {
			return fail(400, { checkEmail: true, email: email?.toString(), verifyError: 'Please enter the 6-digit code.' });
		}

		const { error } = await locals.supabase.auth.verifyOtp({
			email,
			token,
			type: 'signup'
		});

		if (error) {
			return fail(400, {
				checkEmail: true,
				email,
				verifyError: error.message.includes('expired') ? 'Code expired — request a new one.' : 'Invalid code. Try again.'
			});
		}

		redirect(302, '/discover?welcome=1');
	}
};
