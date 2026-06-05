import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS,
	TEST_USERS
} from '../helpers/auth.js';

const TEST_SCOPE = 'admin-rpc-test';

async function cleanScopedRows(admin: SupabaseClient): Promise<void> {
	await admin.from('prompts').update({ audience_scope: null }).eq('audience_scope', TEST_SCOPE);
	await admin.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
	await admin.from('scopes').delete().eq('scope', TEST_SCOPE);
}

describe('Admin scope RPCs (Unit 4 RPCs)', () => {
	let adminClient: SupabaseClient;
	let memberClient: SupabaseClient;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanScopedRows(adminClient);

		await adminClient.from('scopes').insert({
			scope: TEST_SCOPE,
			name: 'Admin RPC test corner',
			description: 'Used to test admin RPC narrow projections.'
		}).throwOnError();

		// Two members in the scope: lisa active, marco revoked.
		await adminClient.from('identity_scopes').insert([
			{ identity_id: SEED_USERS.digit.id, scope: TEST_SCOPE, granted_by: null },
			{ identity_id: SEED_USERS.other.id, scope: TEST_SCOPE, granted_by: null, revoked_at: new Date().toISOString() }
		]).throwOnError();

		// One scoped prompt to populate post_count.
		await adminClient.from('prompts').insert({
			id: `admin-rpc-test-${Date.now()}`,
			author_id: SEED_USERS.digit.id,
			title: 'A scoped post',
			state: 'published',
			region: 'berlin',
			audience_scope: TEST_SCOPE,
			published_at: new Date().toISOString()
		}).throwOnError();

		memberClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
	});

	afterAll(async () => {
		await cleanScopedRows(adminClient);
	});

	describe('admin_scopes_overview()', () => {
		it('returns one row per scope with member and post counts', async () => {
			const { data, error } = await adminClient.rpc('admin_scopes_overview');
			expect(error).toBeNull();
			const row = (data ?? []).find((r: { scope: string }) => r.scope === TEST_SCOPE);
			expect(row).toBeDefined();
			expect(row.name).toBe('Admin RPC test corner');
			expect(row.member_count).toBe(1); // marco is revoked, so excluded
			expect(row.post_count).toBe(1);
		});

		it('authenticated client CANNOT call admin_scopes_overview (service-role only)', async () => {
			const { data, error } = await memberClient.rpc('admin_scopes_overview');
			// PostgREST returns null + permission error when EXECUTE is revoked.
			expect(error).not.toBeNull();
			expect(data).toBeNull();
		});

		it('returns narrow projection (no auth.users fields, no email, no created_by)', async () => {
			const { data } = await adminClient.rpc('admin_scopes_overview');
			const row = (data ?? []).find((r: { scope: string }) => r.scope === TEST_SCOPE);
			// The RPC return type is fixed; these fields should not exist.
			expect(row.email).toBeUndefined();
			expect(row.created_by).toBeUndefined();
			expect(row.last_sign_in_at).toBeUndefined();
			// Allowed fields:
			const allowedKeys = new Set([
				'scope',
				'name',
				'description',
				'created_at',
				'retired_at',
				'member_count',
				'post_count'
			]);
			for (const key of Object.keys(row)) {
				expect(allowedKeys.has(key)).toBe(true);
			}
		});
	});

	describe('admin_scope_members(p_scope)', () => {
		it('returns one row per (member, scope) grant including revoked', async () => {
			const { data, error } = await adminClient.rpc('admin_scope_members', { p_scope: TEST_SCOPE });
			expect(error).toBeNull();
			expect((data ?? []).length).toBe(2);
			const ids = (data ?? []).map((r: { identity_id: string }) => r.identity_id);
			expect(ids).toContain(SEED_USERS.digit.id);
			expect(ids).toContain(SEED_USERS.other.id);
		});

		it('returns narrow projection (no email, no auth.users metadata)', async () => {
			const { data } = await adminClient.rpc('admin_scope_members', { p_scope: TEST_SCOPE });
			const row = (data ?? [])[0];
			expect(row.email).toBeUndefined();
			expect(row.last_sign_in_at).toBeUndefined();
			const allowedKeys = new Set([
				'identity_id',
				'username',
				'display_name',
				'granted_at',
				'revoked_at',
				'last_active_at',
				// Guest fields added for the conference-scope work (20260605100700)
				// — admin-plane-only by the service_role grant, deliberately in
				// the projection so the operator can extend/convert guests.
				'access_expires_at',
				'home_scope'
			]);
			for (const key of Object.keys(row)) {
				expect(allowedKeys.has(key)).toBe(true);
			}
		});

		it('authenticated client CANNOT call admin_scope_members (service-role only)', async () => {
			const { data, error } = await memberClient.rpc('admin_scope_members', { p_scope: TEST_SCOPE });
			expect(error).not.toBeNull();
			expect(data).toBeNull();
		});

		it('non-existent scope returns empty array', async () => {
			const { data, error } = await adminClient.rpc('admin_scope_members', {
				p_scope: 'does-not-exist'
			});
			expect(error).toBeNull();
			expect(data).toEqual([]);
		});
	});

	describe('scopes.created_by nullable', () => {
		it('admin can create a scope with created_by = NULL', async () => {
			const slug = `nullable-test-${Date.now()}`;
			const { error } = await adminClient.from('scopes').insert({
				scope: slug,
				name: 'Null created_by test',
				created_by: null
			});
			expect(error).toBeNull();
			await adminClient.from('scopes').delete().eq('scope', slug);
		});
	});

	describe('ScopeService.autoGrantOnJoin', () => {
		it('admin client inserts identity_scopes via the service method', async () => {
			const { SupabaseScopeService } = await import('../../src/lib/services/scope.js');
			const service = new SupabaseScopeService(adminClient);

			// Use a fresh test user (kai) so we don't collide with grants seeded
			// by other tests in this file.
			const kaiId = TEST_USERS.kai.id;
			await adminClient.from('identity_scopes').delete()
				.eq('identity_id', kaiId)
				.eq('scope', TEST_SCOPE);

			await service.autoGrantOnJoin({
				identityId: kaiId,
				scope: TEST_SCOPE,
				grantedBy: null
			});

			const { data: row } = await adminClient
				.from('identity_scopes')
				.select('identity_id, scope, granted_by, revoked_at')
				.eq('identity_id', kaiId)
				.eq('scope', TEST_SCOPE)
				.maybeSingle();

			expect(row?.identity_id).toBe(kaiId);
			expect(row?.scope).toBe(TEST_SCOPE);
			expect(row?.granted_by).toBeNull();
			expect(row?.revoked_at).toBeNull();

			// Cleanup
			await adminClient.from('identity_scopes').delete()
				.eq('identity_id', kaiId)
				.eq('scope', TEST_SCOPE);
		});

		it('throws when service-role client is not used (RLS rejects anon)', async () => {
			const { SupabaseScopeService } = await import('../../src/lib/services/scope.js');
			const { createClient } = await import('@supabase/supabase-js');
			const anonClient = createClient(
				process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
				process.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
				{ auth: { persistSession: false, autoRefreshToken: false } }
			);
			const service = new SupabaseScopeService(anonClient);

			await expect(
				service.autoGrantOnJoin({
					identityId: TEST_USERS.kai.id,
					scope: TEST_SCOPE,
					grantedBy: null
				})
			).rejects.toThrow();
		});
	});
});
