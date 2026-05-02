import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Admin-tier Supabase client.
 *
 * **Production:** points at a separate Supabase project (`PUBLIC_ADMIN_SUPABASE_URL`).
 * That project's `auth.users` table contains only operator accounts — there is
 * no possibility of a user-tier identity also holding admin authorization,
 * because the two `auth.users` tables are physically different.
 *
 * **Local dev:** falls back to the user-tier project (`PUBLIC_SUPABASE_URL`)
 * when admin env vars are not set. Cookie namespace separation still applies,
 * but the underlying auth.users table is shared. Use `app_metadata.admin_authorized`
 * to mark which seed users are operators in dev.
 *
 * Cookies use the `sb-admin` namespace regardless. They coexist with user-tier
 * `sb-<userProjectRef>-*` cookies in event.cookies without overlap.
 *
 * To set up the production admin project:
 *   1. Create a new Supabase project in the dashboard (e.g., "dyad-admin")
 *   2. Disable public sign-ups in Auth settings
 *   3. Create operator accounts via the dashboard or Admin API with
 *      app_metadata.admin_authorized = true
 *   4. Set PUBLIC_ADMIN_SUPABASE_URL and PUBLIC_ADMIN_SUPABASE_ANON_KEY
 *      in Cloudflare Pages env config (production only)
 *
 * See docs/solutions/identity-decoupling-security-tradeoffs.md.
 */
const ADMIN_COOKIE_NAMESPACE = 'sb-admin';

export function createAdminSupabaseClient(cookies: Cookies): SupabaseClient {
	const url = env.PUBLIC_ADMIN_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
	const anonKey = env.PUBLIC_ADMIN_SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anonKey) {
		throw new Error('Supabase env vars missing — admin Supabase client cannot be created');
	}

	return createServerClient(url, anonKey, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/', secure: dev ? false : options?.secure });
				});
			}
		},
		cookieOptions: { name: ADMIN_COOKIE_NAMESPACE }
	});
}
