import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS
} from '../helpers/auth.js';

const TEST_SCOPE = 'scopes-foundation-test';
const TEST_SCOPE_OTHER = 'scopes-foundation-test-other';

async function cleanTestScopes(admin: SupabaseClient): Promise<void> {
	await admin.from('identity_scopes').delete().in('scope', [TEST_SCOPE, TEST_SCOPE_OTHER]);
	await admin.from('scopes').delete().in('scope', [TEST_SCOPE, TEST_SCOPE_OTHER]);
}

describe('Scopes foundation (Unit 1)', () => {
	let adminClient: SupabaseClient;
	let digitClient: SupabaseClient;
	let otherClient: SupabaseClient;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanTestScopes(adminClient);
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
		await cleanTestScopes(adminClient);
	});

	describe('scopes table', () => {
		it('service-role can INSERT a scope', async () => {
			const { error } = await adminClient.from('scopes').insert({
				scope: TEST_SCOPE,
				name: 'Test corner',
				description: 'A corner used in scopes-foundation tests.',
				created_by: SEED_USERS.digit.id
			});
			expect(error).toBeNull();
		});

		it('authenticated client CANNOT INSERT a scope (service-role only)', async () => {
			const { data, error } = await digitClient.from('scopes').insert({
				scope: 'illegal-scope',
				name: 'Should not exist',
				description: 'authenticated insert must fail',
				created_by: SEED_USERS.digit.id
			}).select();
			// RLS-blocked writes return either an error or zero rows.
			expect(data ?? []).toHaveLength(0);
			if (!error) {
				const { count } = await adminClient
					.from('scopes')
					.select('*', { count: 'exact', head: true })
					.eq('scope', 'illegal-scope');
				expect(count).toBe(0);
			}
		});

		it('grantee CAN SELECT the scope they hold a grant for', async () => {
			await adminClient.from('identity_scopes').insert({
				identity_id: SEED_USERS.digit.id,
				scope: TEST_SCOPE,
				granted_by: SEED_USERS.digit.id
			});

			const { data } = await digitClient
				.from('scopes')
				.select('scope, name, description')
				.eq('scope', TEST_SCOPE)
				.maybeSingle();
			expect(data?.scope).toBe(TEST_SCOPE);
			expect(data?.name).toBe('Test corner');
		});

		it('non-grantee CANNOT SELECT the scope (corner directory not enumerable)', async () => {
			const { data } = await otherClient
				.from('scopes')
				.select('scope')
				.eq('scope', TEST_SCOPE)
				.maybeSingle();
			expect(data).toBeNull();
		});

		it('grantee with revoked grant CANNOT SELECT the scope', async () => {
			await adminClient.from('scopes').insert({
				scope: TEST_SCOPE_OTHER,
				name: 'Revoked corner',
				description: 'used to test revoke',
				created_by: SEED_USERS.digit.id
			});
			await adminClient.from('identity_scopes').insert({
				identity_id: SEED_USERS.other.id,
				scope: TEST_SCOPE_OTHER,
				granted_by: SEED_USERS.digit.id,
				revoked_at: new Date().toISOString()
			});

			const { data } = await otherClient
				.from('scopes')
				.select('scope')
				.eq('scope', TEST_SCOPE_OTHER)
				.maybeSingle();
			expect(data).toBeNull();
		});
	});

	describe('identity_scopes table', () => {
		it('service-role can INSERT an identity_scopes row', async () => {
			const { error } = await adminClient.from('identity_scopes').insert({
				identity_id: SEED_USERS.other.id,
				scope: TEST_SCOPE,
				granted_by: SEED_USERS.digit.id
			});
			expect(error).toBeNull();
		});

		it('granted_by accepts NULL (operator-originated grants)', async () => {
			// Clean any prior row for ava+TEST_SCOPE.
			await adminClient.from('identity_scopes').delete()
				.eq('identity_id', '55555555-5555-5555-5555-555555555555')
				.eq('scope', TEST_SCOPE);

			const { error } = await adminClient.from('identity_scopes').insert({
				identity_id: '55555555-5555-5555-5555-555555555555', // ava
				scope: TEST_SCOPE,
				granted_by: null
			});
			expect(error).toBeNull();
		});

		it('member can SELECT their own grant', async () => {
			const { data } = await digitClient
				.from('identity_scopes')
				.select('scope, granted_at')
				.eq('identity_id', SEED_USERS.digit.id)
				.eq('scope', TEST_SCOPE);
			expect(data ?? []).toHaveLength(1);
		});

		it('member CANNOT SELECT another member\'s grants', async () => {
			const { data } = await digitClient
				.from('identity_scopes')
				.select('scope')
				.eq('identity_id', SEED_USERS.other.id);
			expect(data ?? []).toHaveLength(0);
		});

		it('FK violation: INSERT with non-existent scope fails', async () => {
			const { error } = await adminClient.from('identity_scopes').insert({
				identity_id: SEED_USERS.digit.id,
				scope: 'does-not-exist',
				granted_by: SEED_USERS.digit.id
			});
			expect(error).not.toBeNull();
			expect(error?.code).toBe('23503'); // foreign_key_violation
		});

		it('FK violation: INSERT with non-existent identity_id fails', async () => {
			const { error } = await adminClient.from('identity_scopes').insert({
				identity_id: '99999999-9999-9999-9999-999999999999',
				scope: TEST_SCOPE,
				granted_by: SEED_USERS.digit.id
			});
			expect(error).not.toBeNull();
			expect(error?.code).toBe('23503');
		});

		it('revoked grant still SELECTable to its owner (filtering belongs to app layer, not RLS)', async () => {
			await adminClient.from('identity_scopes').update({
				revoked_at: new Date().toISOString()
			}).eq('identity_id', SEED_USERS.other.id).eq('scope', TEST_SCOPE);

			const { data } = await otherClient
				.from('identity_scopes')
				.select('scope, revoked_at')
				.eq('identity_id', SEED_USERS.other.id)
				.eq('scope', TEST_SCOPE);
			expect(data ?? []).toHaveLength(1);
			expect(data?.[0].revoked_at).not.toBeNull();
		});
	});
});
