import { fail, redirect } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin.js';
import { SupabaseScopeService } from '$lib/services/scope.js';
import { deriveGroupLinkState } from '$lib/domain/group-link.js';
import { copy } from '$lib/copy.js';
import type { Actions, PageServerLoad } from './$types';

// In-memory per-IP rate limiter for group-link signups (the /api/contact
// pattern). The group link is QR-public, so the signup action is the one
// join surface reachable without a per-email token — without a limiter an
// attacker who photographs the QR can burn redemptions in a tight loop.
// Per-isolate on Cloudflare Workers; best-effort, not a hard guarantee —
// the atomic cap in redeem_group_invite_link is the real backstop.
const groupJoinAttempts = new Map<string, { count: number; resetAt: number }>();
const GROUP_JOIN_WINDOW_MS = 15 * 60_000;
const GROUP_JOIN_MAX_ATTEMPTS = 5;

/** Give back a consumed cap slot when signup fails after the atomic redeem
 *  — otherwise failed attempts permanently drain a capped conference link
 *  and the admin counter drifts above the real member count. Best-effort:
 *  a failed release only costs cap headroom. */
async function releaseRedemption(
	admin: ReturnType<typeof makeAdminClient>,
	token: string
): Promise<void> {
	const { error: releaseError } = await admin.rpc('release_group_invite_redemption', {
		p_token: token
	});
	if (releaseError) {
		console.error('[join] failed to release group-link redemption:', releaseError.message);
	}
}

function isGroupJoinRateLimited(ip: string): boolean {
	const now = Date.now();
	// Opportunistic sweep of expired entries — keeps the Map bounded over an
	// isolate's lifetime without a global timer (Workers restrict timers
	// outside request context).
	for (const [key, value] of groupJoinAttempts) {
		if (now > value.resetAt) groupJoinAttempts.delete(key);
	}
	const entry = groupJoinAttempts.get(ip);
	if (!entry) {
		groupJoinAttempts.set(ip, { count: 1, resetAt: now + GROUP_JOIN_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > GROUP_JOIN_MAX_ATTEMPTS;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session } = await locals.safeGetSession();
	const glink = url.searchParams.get('glink');

	if (session) {
		if (glink) {
			// An existing member opened a shared group link. Informational state
			// only — corner grants for existing members go through the admin
			// plane, not link redemption (see plan Scope Boundaries).
			return { kind: 'group-authed' as const };
		}
		redirect(302, '/discover');
	}

	if (glink) {
		// group_invite_links has no anon access by design (migration
		// 20260605100100); the page validates through the admin client.
		const admin = makeAdminClient();
		const { data: link } = await admin
			.from('group_invite_links')
			.select('scope, join_closes_at, access_expires_at, max_redemptions, redemption_count, revoked_at')
			.eq('token', glink)
			.maybeSingle();

		let state = deriveGroupLinkState(link);
		let scopeName: string | null = null;
		if (link) {
			const { data: scopeRow } = await admin
				.from('scopes')
				.select('name, retired_at')
				.eq('scope', link.scope)
				.maybeSingle();
			scopeName = scopeRow?.name ?? null;
			// A retired corner takes no new members regardless of link state.
			if (state === 'open' && scopeRow?.retired_at) state = 'closed';
		}

		return { kind: 'group' as const, glink, state, scopeName };
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
		return { kind: 'invite' as const, valid: false, email: null, token };
	}

	const invitation = data[0];
	if (!invitation.valid) {
		return { kind: 'invite' as const, valid: false, email: null, token };
	}

	return { kind: 'invite' as const, valid: true, email: invitation.email, token };
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
	},

	groupJoin: async ({ request, locals, getClientAddress }) => {
		const formData = await request.formData();
		const glink = formData.get('glink');
		const username = formData.get('username');
		const email = formData.get('email');
		const password = formData.get('password');

		if (typeof glink !== 'string' || !glink) {
			return fail(400, { username: username?.toString(), error: 'This link isn\'t valid' });
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
		// Unlike the per-email invite path, the group form's email is real input
		// — validate shape here; uniqueness is pre-checked below.
		if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { username, error: 'A valid email is required' });
		}
		if (typeof password !== 'string' || password.length < 8) {
			return fail(400, { username, error: 'Password must be at least 8 characters' });
		}
		if (password.length > 128) {
			return fail(400, { username, error: 'Password must be at most 128 characters' });
		}

		// Rate limit before any database work — the link token is QR-public.
		let clientIp = request.headers.get('cf-connecting-ip') ?? '';
		if (!clientIp) {
			try { clientIp = getClientAddress(); } catch { clientIp = 'unknown'; }
		}
		if (isGroupJoinRateLimited(clientIp)) {
			return fail(429, { username, error: copy.auth.groupTooManyAttempts });
		}

		const admin = makeAdminClient();

		// Cheap pre-checks BEFORE the atomic redemption so failed attempts
		// don't consume cap slots (taken username / registered email are the
		// common cases at a conference). Independent reads — run in parallel.
		const [{ data: existingProfile }, { data: emailRegistered }] = await Promise.all([
			admin.from('profiles').select('username').eq('username', username).maybeSingle(),
			admin.rpc('email_is_registered', { p_email: email })
		]);
		if (existingProfile) {
			return fail(400, { username, error: 'Username is already taken' });
		}
		if (emailRegistered === true) {
			return fail(400, { username, error: copy.auth.groupEmailRegistered });
		}

		// Atomic redemption: window, cap, and revocation re-checked under a row
		// lock (migration 20260605100300). Failing here is the normal path for
		// a link that closed between page load and submit.
		const { data: redeemed, error: redeemError } = await admin.rpc('redeem_group_invite_link', {
			p_token: glink
		});
		if (redeemError || !redeemed || redeemed.length === 0) {
			const msg = redeemError?.message ?? '';
			console.error('[join] group link redemption failed:', msg);
			const friendly = msg.includes('group_link_full')
				? copy.auth.groupJoinErrors.full
				: msg.includes('group_link_closed')
					? copy.auth.groupJoinErrors.closed
					: msg.includes('group_link_revoked')
						? copy.auth.groupJoinErrors.revoked
						: copy.auth.groupJoinErrors.unknown;
			return fail(400, { username, error: friendly });
		}
		const { scope: grantedScope, access_expires_at: accessExpiresAt } = redeemed[0] as {
			scope: string;
			access_expires_at: string;
		};

		// Guests carry berlin_based: false explicitly — the checkbox is not
		// shown on the group form and the metadata field stays well-defined.
		const { data: createUserData, error: signUpError } = await admin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { username, berlin_based: false }
		});

		if (signUpError || !createUserData?.user?.id) {
			console.error('[join] group admin.createUser failed:', signUpError);
			await releaseRedemption(admin, glink);
			const msg = signUpError?.message?.toLowerCase() ?? '';
			const friendly = msg.includes('already') || msg.includes('exists')
				? copy.auth.groupEmailRegistered
				: 'Could not create your account. Please try again.';
			return fail(400, { username, error: friendly });
		}

		const newIdentityId = createUserData.user.id;

		// Grant the corner and stamp the guest context. A guest without their
		// corner grant or expiry stamp would be a permanent commons member by
		// gate semantics — so unlike the per-email invite's fail-open grant,
		// failure here compensates by deleting the just-created account and
		// asking the attendee to retry.
		try {
			const scopeService = new SupabaseScopeService(admin);
			await scopeService.autoGrantOnJoin({
				identityId: newIdentityId,
				scope: grantedScope,
				grantedBy: null
			});
			const { error: stampError } = await admin
				.from('profiles')
				.update({ access_expires_at: accessExpiresAt, home_scope: grantedScope })
				.eq('id', newIdentityId);
			if (stampError) throw new Error(stampError.message);
		} catch (setupError) {
			console.error(
				'[join] group grant/stamp failed, removing the partial account:',
				setupError instanceof Error ? setupError.message : String(setupError)
			);
			// FK order: profiles → identities → auth user. Each step has its own
			// guard so one failure doesn't skip the rest (a surviving auth user
			// with no profile would wedge re-registration of the same email).
			// The distinct tag makes unrecovered partials greppable in logs;
			// recovery is manual (admin plane has no orphan view).
			for (const step of [
				() => admin.from('profiles').delete().eq('id', newIdentityId),
				() => admin.from('identities').delete().eq('id', newIdentityId),
				() => admin.auth.admin.deleteUser(newIdentityId)
			]) {
				try {
					const { error: cleanupError } = await step();
					if (cleanupError) throw new Error(cleanupError.message);
				} catch (cleanupError) {
					console.error('[join][unrecovered-partial-account]', newIdentityId, cleanupError);
				}
			}
			await releaseRedemption(admin, glink);
			return fail(500, { username, error: copy.auth.groupSetupFailed });
		}

		const { error: signInError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (!signInError) {
			// No ?welcome=1 — guests skip the commons onboarding (corner-exclusive
			// context is set by hooks from the stamped profile).
			redirect(302, '/discover');
		}

		return { success: true, message: 'Account created! You can sign in now.' };
	}
};
