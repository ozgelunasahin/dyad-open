import { error } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin';
import { joinOrigin } from '$lib/server/app-origin.js';
import { deriveGroupLinkState, type GroupLinkStateInput } from '$lib/domain/group-link.js';
import type { PageServerLoad } from './$types';

/**
 * Admin Scope detail view — one corner with member detail.
 *
 * Mirrors /admin/members (PR #26): SECURITY DEFINER RPC returns a narrow
 * projection (identity_id, username, display_name, granted_at, revoked_at,
 * last_active_at). No auth.users access; no email; no sign-in history.
 */

export interface ScopeMemberRow {
	identity_id: string;
	username: string | null;
	display_name: string | null;
	granted_at: string;
	revoked_at: string | null;
	last_active_at: string | null;
	/** Guest access window end — null for permanent members. */
	access_expires_at: string | null;
	/** Home corner of a guest — null for commons members. */
	home_scope: string | null;
}

export interface ScopeDetail {
	scope: string;
	name: string;
	description: string | null;
	region: string | null;
	created_at: string;
	retired_at: string | null;
	post_count: number;
}

export interface GroupLinkRow {
	id: string;
	token: string;
	label: string | null;
	join_closes_at: string;
	access_expires_at: string;
	max_redemptions: number | null;
	redemption_count: number;
	revoked_at: string | null;
	created_at: string;
	/** Derived: active | closed | full | revoked */
	status: string;
	url: string;
}

/** Admin list vocabulary: the shared lifecycle state, with 'open' displayed
 *  as 'active'. */
function deriveLinkStatus(link: GroupLinkStateInput): string {
	const state = deriveGroupLinkState(link);
	return state === 'open' ? 'active' : state;
}

export const load: PageServerLoad = async ({ params }) => {
	const supabase = makeAdminClient();

	const { data: scopeRow } = await supabase
		.from('scopes')
		.select('scope, name, description, region, created_at, retired_at')
		.eq('scope', params.scope)
		.maybeSingle();

	if (!scopeRow) {
		error(404, 'Corner not found');
	}

	const [{ count: postCount }, { data: members, error: membersError }, { data: links }] =
		await Promise.all([
			supabase
				.from('prompts')
				.select('*', { count: 'exact', head: true })
				.eq('audience_scope', params.scope),
			supabase.rpc('admin_scope_members', { p_scope: params.scope }),
			supabase
				.from('group_invite_links')
				.select(
					'id, token, label, join_closes_at, access_expires_at, max_redemptions, redemption_count, revoked_at, created_at'
				)
				.eq('scope', params.scope)
				.order('created_at', { ascending: false })
		]);

	if (membersError) {
		console.error('[admin/scopes/[scope]] members query failed:', membersError.message);
	}

	return {
		scope: {
			...scopeRow,
			post_count: postCount ?? 0
		} as ScopeDetail,
		members: (members ?? []) as ScopeMemberRow[],
		links: (links ?? []).map((l) => ({
			...l,
			status: deriveLinkStatus(l),
			// Join host follows the corner's region (e.g. dyad.amsterdam) so the
			// copied URL / QR lands guests on the host they'll live under.
			url: `${joinOrigin(scopeRow.region)}/join?glink=${l.token}`
		})) as GroupLinkRow[]
	};
};
