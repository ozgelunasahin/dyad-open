import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

function makeAdminClient() {
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
	return createClient(PUBLIC_SUPABASE_URL, key, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		redirect(302, '/discover');
	}

	// Signup is open to anyone. `ref` is optional: when present (or when the
	// dyad_ref cookie is set) the new profile records who referred them.
	const ref = url.searchParams.get('ref') ?? null;

	// We do not validate whether `ref` resolves to an existing profile here.
	// Differentiating the response based on profile existence would let an
	// unauthenticated visitor enumerate usernames by toggling the ref param.
	// The signup action resolves the ref to a UUID; if it doesn't resolve,
	// referred_by is left null. No new information is leaked at load time.

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
		// Berlin is implicit for commons signups (dyad.berlin) — we no longer
		// ask; the metadata field stays well-defined and defaults to true.
		const berlinBased = true;

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
			// Map known Supabase errors to friendly messages. Log the raw error for
			// maintainers; never leak Postgres/constraint details to signup users.
			console.error('[signup] supabase auth error:', signUpError);
			let friendly: string;
			if (msg.includes('already registered')) {
				friendly = 'An account with this email already exists.';
			} else if (msg.toLowerCase().includes('password')) {
				friendly = 'Password is too weak. Use at least 8 characters.';
			} else if (msg.toLowerCase().includes('email')) {
				friendly = 'That email address looks invalid.';
			} else {
				friendly = 'Could not create your account. Please try again.';
			}
			return fail(400, { username, error: friendly });
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
