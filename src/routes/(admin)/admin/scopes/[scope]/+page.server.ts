import { error } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin';
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
}

export interface ScopeDetail {
	scope: string;
	name: string;
	description: string | null;
	created_at: string;
	retired_at: string | null;
	post_count: number;
}

export const load: PageServerLoad = async ({ params }) => {
	const supabase = makeAdminClient();

	const { data: scopeRow } = await supabase
		.from('scopes')
		.select('scope, name, description, created_at, retired_at')
		.eq('scope', params.scope)
		.maybeSingle();

	if (!scopeRow) {
		error(404, 'Corner not found');
	}

	const { count: postCount } = await supabase
		.from('prompts')
		.select('*', { count: 'exact', head: true })
		.eq('audience_scope', params.scope);

	const { data: members, error: membersError } = await supabase.rpc('admin_scope_members', {
		p_scope: params.scope
	});

	if (membersError) {
		console.error('[admin/scopes/[scope]] members query failed:', membersError.message);
	}

	return {
		scope: {
			...scopeRow,
			post_count: postCount ?? 0
		} as ScopeDetail,
		members: (members ?? []) as ScopeMemberRow[]
	};
};
