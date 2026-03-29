import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── Localhost guard ─────────────────────────────────────────────────────
// Prevents tests from accidentally running against production/staging.
if (!SUPABASE_URL.startsWith('http://127.0.0.1') && !SUPABASE_URL.startsWith('http://localhost')) {
	throw new Error(
		`SAFETY: Tests must run against a local Supabase instance.\n` +
		`PUBLIC_SUPABASE_URL is "${SUPABASE_URL}" which is not localhost.\n` +
		`Set PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 or run 'supabase start'.`
	);
}

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

// ── Test users — must match supabase/seed.sql ───────────────────────────
// All emails use @test.invalid (RFC 2606 — guaranteed undeliverable).
// Integration tests use lisa + marco. E2E tests use sophie + tom.
export const TEST_USERS = {
	lisa: {
		id: '11111111-1111-1111-1111-111111111111',
		email: 'lisa@test.invalid',
		password: 'password123',
		username: 'lisa',
		isAdmin: true,
		storagePath: 'tests/.auth/lisa.json',
	},
	marco: {
		id: '22222222-2222-2222-2222-222222222222',
		email: 'marco@test.invalid',
		password: 'password123',
		username: 'marco',
		isAdmin: false,
		storagePath: 'tests/.auth/marco.json',
	},
	sophie: {
		id: '33333333-3333-3333-3333-333333333333',
		email: 'sophie@test.invalid',
		password: 'dyad2026!',
		username: 'sophie',
		isAdmin: false,
		storagePath: 'tests/.auth/sophie.json',
	},
	tom: {
		id: '44444444-4444-4444-4444-444444444444',
		email: 'tom@test.invalid',
		password: 'dyad2026!',
		username: 'tom',
		isAdmin: false,
		storagePath: 'tests/.auth/tom.json',
	},
	ava: {
		id: '55555555-5555-5555-5555-555555555555',
		email: 'ava@test.invalid',
		password: 'password123',
		username: 'ava',
		isAdmin: false,
		storagePath: 'tests/.auth/ava.json',
	},
	ben: {
		id: '66666666-6666-6666-6666-666666666666',
		email: 'ben@test.invalid',
		password: 'password123',
		username: 'ben',
		isAdmin: false,
		storagePath: 'tests/.auth/ben.json',
	},
	nina: {
		id: '77777777-7777-7777-7777-777777777777',
		email: 'nina@test.invalid',
		password: 'password123',
		username: 'nina',
		isAdmin: false,
		storagePath: 'tests/.auth/nina.json',
	},
	kai: {
		id: '88888888-8888-8888-8888-888888888888',
		email: 'kai@test.invalid',
		password: 'password123',
		username: 'kai',
		isAdmin: false,
		storagePath: 'tests/.auth/kai.json',
	},
} as const;

// ── Seed prompt IDs — must match supabase/seed.sql ──────────────────────
export const TEST_PROMPTS = {
	published: 'seed-prompt-published',
	draft: 'seed-prompt-draft',
	archived: 'seed-prompt-archived',
	marco: 'seed-prompt-marco',
} as const;

// Backwards-compat aliases — integration tests use these names
export const SEED_USERS = {
	digit: TEST_USERS.lisa,
	other: TEST_USERS.marco,
} as const;

export const SEED_PROMPTS = TEST_PROMPTS;
