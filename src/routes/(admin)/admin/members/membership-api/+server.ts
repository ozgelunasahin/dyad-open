import { json } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { SupabaseMembershipService } from '$lib/services/membership.js';
import type { MembershipSource } from '$lib/domain/types.js';
import type { RequestHandler } from './$types';

/**
 * Operator grant/revoke of membership without payment (plan U9 / R5). Lives
 * under /admin/* and is gated by the Cloudflare Access hook in
 * src/hooks.server.ts; writes via the service-role client.
 *
 * - POST  { username, source }            — grant an active membership. source
 *                                            ∈ comp | founding | grandfathered.
 *                                            No Stripe record; active=true; the
 *                                            actor passes the gate exactly like
 *                                            a paid member. Operator attribution
 *                                            is null (Cloudflare Access principal).
 * - PATCH { identity_id, active: false }   — revoke (flip active off).
 *
 * Mirrors the scope grant/revoke pattern: grant-by-username (profiles.id →
 * identities.id), service-role writes.
 */

const GRANTABLE_SOURCES: MembershipSource[] = ['comp', 'founding', 'grandfathered'];

export const POST: RequestHandler = async ({ request }) => {
	const admin = makeAdminClient();
	const [body, errorResponse] = await parseJsonBody<{ username?: string; source?: string }>(request);
	if (errorResponse) return errorResponse;

	const { username, source } = body;
	if (typeof username !== 'string' || !username.trim()) {
		return json({ error: 'username is required' }, { status: 400 });
	}
	if (!GRANTABLE_SOURCES.includes(source as MembershipSource)) {
		return json(
			{ error: `source must be one of: ${GRANTABLE_SOURCES.join(', ')}` },
			{ status: 400 }
		);
	}

	// memberships.identity_id FKs to identities(id), resolved via profiles.
	const { data: profile } = await admin
		.from('profiles')
		.select('id')
		.eq('username', username.trim())
		.maybeSingle();
	if (!profile?.id) {
		return json({ error: 'No member with that username' }, { status: 404 });
	}

	try {
		await new SupabaseMembershipService(admin).upsertMembership({
			identity_id: profile.id,
			source: source as MembershipSource,
			active: true
		});
	} catch (err) {
		console.error('[admin/members/membership-api] grant failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'Failed to grant membership' }, { status: 500 });
	}

	return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const admin = makeAdminClient();
	const [body, errorResponse] = await parseJsonBody<{ identity_id?: string; active?: boolean }>(request);
	if (errorResponse) return errorResponse;

	const { identity_id, active } = body;
	if (typeof identity_id !== 'string') {
		return json({ error: 'identity_id is required' }, { status: 400 });
	}
	if (active !== false) {
		return json({ error: 'active must be false (revoke only)' }, { status: 400 });
	}

	try {
		await new SupabaseMembershipService(admin).updateMembership(identity_id, { active: false });
	} catch (err) {
		console.error('[admin/members/membership-api] revoke failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'Failed to revoke membership' }, { status: 500 });
	}

	return json({ ok: true });
};
