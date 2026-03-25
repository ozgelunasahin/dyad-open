import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Admin client — bypasses RLS. Used for test setup/teardown only. */
export function createAdminClient(): SupabaseClient {
	if (!SERVICE_ROLE_KEY) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
	}
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

/** Create a Supabase client authenticated as a specific user. Subject to RLS. */
export async function createAuthenticatedClient(
	email: string,
	password: string
): Promise<SupabaseClient> {
	if (!ANON_KEY) {
		throw new Error('PUBLIC_SUPABASE_ANON_KEY is required');
	}
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const { error } = await client.auth.signInWithPassword({ email, password });
	if (error) {
		throw new Error(`Failed to sign in as ${email}: ${error.message}`);
	}

	return client;
}

// Deterministic seed user IDs (must match supabase/seed.sql)
export const SEED_USERS = {
	digit: {
		id: '11111111-1111-1111-1111-111111111111',
		email: 'digit@test.local',
		password: 'password123',
		username: 'digit'
	},
	other: {
		id: '22222222-2222-2222-2222-222222222222',
		email: 'other@test.local',
		password: 'password123',
		username: 'otherperson'
	}
} as const;

// Deterministic seed prompt IDs (must match supabase/seed.sql)
export const SEED_PROMPTS = {
	published: 'seed-prompt-published',
	draft: 'seed-prompt-draft',
	other: 'seed-prompt-other'
} as const;
