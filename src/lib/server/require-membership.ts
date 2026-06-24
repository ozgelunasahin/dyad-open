import { json } from '@sveltejs/kit';
import { requireIdentity } from '$lib/services/identity.js';
import { getMembershipGating } from '$lib/server/app-settings.js';
import type { ProtectedAction } from '$lib/domain/gating.js';

/**
 * Primary, user-facing membership gate for a protected mutating action.
 *
 * Returns `null` when the action is allowed (flag off, or the actor holds an
 * active membership) and the caller should proceed. Returns a 403 Response —
 * `{ error: 'membership_required', action, had_membership }` — when the action
 * is gated and the actor is not active. `had_membership` distinguishes a lapsed
 * member (true → "renew") from a never-member guest (false → "join").
 *
 * This mirrors the SQL `app.gating_allows`; it is the primary, clean-403 gate,
 * with the split RLS `FOR INSERT WITH CHECK` and the accept_invitation RPC body
 * as the safety net. Fails OPEN on an unexpected error (consistent with the
 * feedback/access gates) — the safety net still applies at the data layer.
 */
export async function requireMembershipForAction(
	action: ProtectedAction,
	locals: App.Locals
): Promise<Response | null> {
	const actor = requireIdentity(locals); // throws 401 if unauthenticated

	let gated: boolean;
	try {
		const gating = await getMembershipGating();
		gated = gating[action] === true;
	} catch (err) {
		console.error(
			'[require-membership] gating config read failed (failing open):',
			err instanceof Error ? err.message : 'unknown'
		);
		return null;
	}
	if (!gated) return null;

	// Read the actor's own row (RLS SELECT-own). Select only `active` so this
	// never depends on the opaque-ref columns' grant.
	const { data, error } = await locals.supabase
		.from('memberships')
		.select('active')
		.eq('identity_id', actor.id)
		.maybeSingle();
	if (error) {
		console.error('[require-membership] membership read failed (failing open):', error.message);
		return null;
	}
	if (data?.active === true) return null;

	return json(
		{ error: 'membership_required', action, had_membership: data !== null },
		{ status: 403 }
	);
}
