import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Admin authorization check (separate from authentication).
 *
 * Admins authenticate via /admin/login through the admin-namespaced Supabase
 * client (sb-admin cookies — see admin-supabase.ts). After authentication, this
 * helper checks the app_metadata.admin_authorized claim to confirm the user is
 * authorized to access the admin plane.
 *
 * The claim is set via the Supabase Admin API (immutable from the client side):
 *
 *   UPDATE auth.users SET raw_app_meta_data =
 *     raw_app_meta_data || '{"admin_authorized": true}'::jsonb
 *   WHERE email = '<admin-email>';
 *
 * To revoke admin access: set the claim to false (or remove it) and the user's
 * next request will be denied.
 *
 * See docs/solutions/identity-decoupling-security-tradeoffs.md.
 */

/**
 * Returns the authenticated admin user if and only if:
 *   1. The admin Supabase client has a valid session (sb-admin cookies present)
 *   2. That session's user has app_metadata.admin_authorized = true
 *
 * Returns null in any other case (no session, or session but not authorized).
 *
 * Pure function — no env dependency, takes the admin Supabase client. The
 * caller (hooks, login route) constructs the client and passes it in.
 */
export async function getAuthorizedAdminUser(
	adminSupabase: SupabaseClient
): Promise<User | null> {
	const { data, error } = await adminSupabase.auth.getUser();
	if (error || !data.user) return null;
	if (!isAdminAuthorized(data.user)) return null;
	return data.user;
}

/**
 * Pure predicate: is this user authorized for the admin plane?
 *
 * Exported for testing and for use in the login flow (after authentication
 * we check this claim before issuing the admin session).
 */
export function isAdminAuthorized(user: User): boolean {
	return user.app_metadata?.admin_authorized === true;
}
