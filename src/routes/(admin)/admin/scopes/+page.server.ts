import { makeAdminClient } from '$lib/server/supabase-admin';
import type { PageServerLoad } from './$types';

/**
 * Admin Scopes list view — one row per corner with member and post counts.
 *
 * Posture rationale: mirrors /admin/members (PR 26). The list view answers
 * the operator question "which corners exist, and are they being used?"
 * without exposing any per-member detail. Drill-down to /admin/scopes/[scope]
 * for member detail (still narrow per minimum-disclosure).
 *
 * The admin plane bypasses the type-system enforcement of the upact port via
 * makeAdminClient (service-role); the discipline of narrow-projection-by-RPC
 * is the operator-side equivalent of the same posture.
 */

export interface ScopeOverviewRow {
	scope: string;
	name: string;
	description: string | null;
	created_at: string;
	retired_at: string | null;
	member_count: number;
	post_count: number;
}

export const load: PageServerLoad = async () => {
	const supabase = makeAdminClient();

	const { data, error } = await supabase.rpc('admin_scopes_overview');

	if (error) {
		console.error('[admin/scopes] overview query failed:', error.message);
		return { scopes: [] as ScopeOverviewRow[] };
	}

	return { scopes: (data ?? []) as ScopeOverviewRow[] };
};
