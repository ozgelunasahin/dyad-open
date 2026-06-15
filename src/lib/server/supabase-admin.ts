import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

/**
 * Service-role Supabase client for admin-only operations (creating users with
 * `email_confirm: true`, reading across RLS, etc.). Never exposed to the client
 * bundle — this import path is server-only via `$env/dynamic/private`.
 *
 * Keeps session persistence off so this client can't accidentally authenticate
 * the request chain; every admin call should be explicit about what it's doing.
 */
export function makeAdminClient(): SupabaseClient {
	const key = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
	return createClient(PUBLIC_SUPABASE_URL, key, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}
