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
 *
 * Forward note: when corner scopes ship (see
 * ~/prefig/docs/dyad/ideation/2026-05-08-visibility-scope-corners-ideation.md),
 * add a `corners` column via array_agg(scope) FILTER (WHERE revoked_at IS NULL)
 * joined against identity_scopes.
 */
export interface MemberRow {
	id: string;
	username: string | null;
	display_name: string | null;
	last_active_at: string | null;
}

export const load: PageServerLoad = async () => {
	const supabase = makeAdminClient();

	const { data, error } = await supabase.rpc('admin_member_activity');

	if (error) {
		console.error('[admin/members] activity query failed:', error.message);
		return { members: [] as MemberRow[] };
	}

	return { members: (data ?? []) as MemberRow[] };
};
