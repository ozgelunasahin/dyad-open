import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS
} from '../helpers/auth.js';

const TEST_SCOPE = 'access-ctx-test';
const RETIRED_SCOPE = 'access-ctx-retired';

async function cleanTestData(admin: SupabaseClient): Promise<void> {
	await admin
		.from('profiles')
		.update({ access_expires_at: null, home_scope: null })
		.eq('id', SEED_USERS.other.id);
	await admin.from('identity_scopes').delete().in('scope', [TEST_SCOPE, RETIRED_SCOPE]);
	await admin.from('scopes').delete().in('scope', [TEST_SCOPE, RETIRED_SCOPE]);
}

describe('Access context (U1)', () => {
	let admin: SupabaseClient;
	let digitClient: SupabaseClient;
	let otherClient: SupabaseClient;

	beforeAll(async () => {
		admin = createAdminClient();
		await cleanTestData(admin);
		await admin.from('scopes').insert([
			{
				scope: TEST_SCOPE,
				name: 'Access context corner',
				description: 'used by access-context integration tests',
				created_by: SEED_USERS.digit.id,
				region: 'amsterdam'
			},
			{
				scope: RETIRED_SCOPE,
				name: 'Retired corner',
				description: 'retired corner for access-context tests',
				created_by: SEED_USERS.digit.id,
				retired_at: new Date().toISOString()
			}
		]);
		digitClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
		otherClient = await createAuthenticatedClient(
			SEED_USERS.other.email,
			SEED_USERS.other.password
		);
	});

	afterAll(async () => {
		await cleanTestData(admin);
	});

	describe('get_my_access_context RPC', () => {
		it('returns commons defaults for a permanent member', async () => {
			const { data, error } = await otherClient.rpc('get_my_access_context');
			expect(error).toBeNull();
			const row = data?.[0];
			expect(row).toBeDefined();
			expect(row.scopes).toEqual([]);
			expect(row.access_expires_at).toBeNull();
			expect(row.home_scope).toBeNull();
			expect(row.home_region).toBeNull();
		});

		it('returns scopes, expiry, home corner and region for a stamped guest', async () => {
			const expiry = new Date(Date.now() + 48 * 3600_000).toISOString();
			await admin.from('identity_scopes').insert({
				identity_id: SEED_USERS.other.id,
				scope: TEST_SCOPE,
				granted_by: null
			});
			await admin
				.from('profiles')
				.update({ access_expires_at: expiry, home_scope: TEST_SCOPE })
				.eq('id', SEED_USERS.other.id);

			const { data, error } = await otherClient.rpc('get_my_access_context');
			expect(error).toBeNull();
			const row = data?.[0];
			expect(row.scopes).toEqual([TEST_SCOPE]);
			expect(new Date(row.access_expires_at).toISOString()).toBe(
				new Date(expiry).toISOString()
			);
			expect(row.home_scope).toBe(TEST_SCOPE);
			expect(row.home_region).toBe('amsterdam');
		});

		it('excludes grants on retired scopes', async () => {
			await admin.from('identity_scopes').insert({
				identity_id: SEED_USERS.other.id,
				scope: RETIRED_SCOPE,
				granted_by: null
			});

			const { data } = await otherClient.rpc('get_my_access_context');
			expect(data?.[0].scopes).toEqual([TEST_SCOPE]);
		});

		it('excludes revoked grants', async () => {
			await admin
				.from('identity_scopes')
				.update({ revoked_at: new Date().toISOString() })
				.eq('identity_id', SEED_USERS.other.id)
				.eq('scope', TEST_SCOPE);

			const { data } = await otherClient.rpc('get_my_access_context');
			expect(data?.[0].scopes).toEqual([]);
			// home_scope/expiry are profile fields — unaffected by grant revocation.
			expect(data?.[0].home_scope).toBe(TEST_SCOPE);
		});
	});

	describe('profiles column grants', () => {
		it('a member cannot read another member\'s access fields', async () => {
			const { error } = await digitClient
				.from('profiles')
				.select('access_expires_at, home_scope')
				.eq('id', SEED_USERS.other.id);
			expect(error).not.toBeNull();
			expect(error?.code).toBe('42501'); // insufficient_privilege (column grant)
		});

		it('a member cannot read the access fields on their own row either', async () => {
			const { error } = await otherClient
				.from('profiles')
				.select('access_expires_at')
				.eq('id', SEED_USERS.other.id);
			expect(error).not.toBeNull();
			expect(error?.code).toBe('42501');
		});

		it('a member cannot clear their own access expiry (column grant on UPDATE)', async () => {
			const { error } = await otherClient
				.from('profiles')
				.update({ access_expires_at: null })
				.eq('id', SEED_USERS.other.id);
			expect(error).not.toBeNull();
			expect(error?.code).toBe('42501');

			// The stamped value survives.
			const { data } = await admin
				.from('profiles')
				.select('access_expires_at')
				.eq('id', SEED_USERS.other.id)
				.single();
			expect(data?.access_expires_at).not.toBeNull();
		});
	});
});
