import { makeAdminClient } from '$lib/server/supabase-admin';
import type { PageServerLoad } from './$types';

/**
 * Admin Members view — one row per member, last-activity timestamp derived
 * from application data only. Answers the operator question "is this member
 * interacting with the platform at all?" without touching auth.users — the
 * operator does not see sign-in history, email, or other identity-shaped
 * behavioral metadata.
 *
 * Posture rationale: upact's minimum-disclosure binding is a guarantee to
 * members about what the operator can know. The admin plane bypasses the
 * type-system enforcement (it imports the substrate via makeAdminClient),
 * but the discipline still applies — admin tooling should respect the same
 * minimum-disclosure shape that member-facing services do.
 */
export interface MemberRow {
	id: string;
	username: string | null;
	display_name: string | null;
	last_active_at: string | null;
	membership: { active: boolean; source: string; cadence: string | null } | null;
}

export const load: PageServerLoad = async () => {
	const supabase = makeAdminClient();

	const [{ data, error }, { data: memberships }] = await Promise.all([
		supabase.rpc('admin_member_activity'),
		// Opaque references are deliberately NOT selected — the operator sees only
		// the entitlement state, never the Stripe/payment_ref tokens.
		supabase.from('memberships').select('identity_id, active, source, cadence')
	]);

	if (error) {
		console.error('[admin/members] activity query failed:', error.message);
		return { members: [] as MemberRow[] };
	}

	const byId = new Map(
		(memberships ?? []).map((m) => [
			m.identity_id as string,
			{ active: m.active as boolean, source: m.source as string, cadence: m.cadence as string | null }
		])
	);

	const members = ((data ?? []) as Omit<MemberRow, 'membership'>[]).map((m) => ({
		...m,
		membership: byId.get(m.id) ?? null
	}));

	return { members };
};
