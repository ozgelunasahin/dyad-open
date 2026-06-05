import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, SEED_USERS } from '../helpers/auth.js';
import { SupabaseScopeService } from '../../src/lib/services/scope.js';

const TEST_SCOPE = 'glink-join-corner';
const GUEST_EMAIL = 'glink-guest@test.invalid';
const GUEST_USERNAME = 'glink-guest';
const GUEST_PASSWORD = 'local-fixture-not-a-secret';

const FUTURE = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();

async function deleteGuestUser(admin: SupabaseClient): Promise<void> {
	// FK order: profiles → identities → auth user (mirrors the join action's
	// compensating delete).
	const { data: profile } = await admin
		.from('profiles')
		.select('id')
		.eq('username', GUEST_USERNAME)
		.maybeSingle();
	const id = profile?.id;
	if (id) {
		await admin.from('identity_scopes').delete().eq('identity_id', id);
		await admin.from('profiles').delete().eq('id', id);
		await admin.from('identities').delete().eq('id', id);
		await admin.auth.admin.deleteUser(id);
	}
}

async function cleanRows(admin: SupabaseClient): Promise<void> {
	await deleteGuestUser(admin);
	await admin.from('group_invite_links').delete().eq('scope', TEST_SCOPE);
	await admin.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
	await admin.from('scopes').delete().eq('scope', TEST_SCOPE);
}

describe('Group-link join flow (U5)', () => {
	let admin: SupabaseClient;

	beforeAll(async () => {
		admin = createAdminClient();
		await cleanRows(admin);
		await admin.from('scopes').insert({
			scope: TEST_SCOPE,
			name: 'Group join corner',
			description: 'Used by group-link-join integration tests.',
			created_by: SEED_USERS.digit.id,
			region: 'amsterdam'
		});
	});

	afterAll(async () => {
		await cleanRows(admin);
	});

	it('full redemption flow: redeem → create → grant → stamp → guest context', async () => {
		const accessEnd = FUTURE(48);
		await admin.from('group_invite_links').insert({
			token: 'glj-flow',
			scope: TEST_SCOPE,
			join_closes_at: FUTURE(24),
			access_expires_at: accessEnd,
			max_redemptions: 10
		});

		// 1. Atomic redemption.
		const { data: redeemed, error: redeemError } = await admin.rpc('redeem_group_invite_link', {
			p_token: 'glj-flow'
		});
		expect(redeemError).toBeNull();
		const grant = redeemed![0] as { scope: string; access_expires_at: string };
		expect(grant.scope).toBe(TEST_SCOPE);

		// 2. Account creation (the handle_new_user trigger creates identities +
		// profiles synchronously).
		const { data: created, error: createError } = await admin.auth.admin.createUser({
			email: GUEST_EMAIL,
			password: GUEST_PASSWORD,
			email_confirm: true,
			user_metadata: { username: GUEST_USERNAME, berlin_based: false }
		});
		expect(createError).toBeNull();
		const newId = created!.user!.id;

		// 3. Grant + stamp.
		const scopeService = new SupabaseScopeService(admin);
		await scopeService.autoGrantOnJoin({ identityId: newId, scope: TEST_SCOPE, grantedBy: null });
		const { error: stampError } = await admin
			.from('profiles')
			.update({ access_expires_at: grant.access_expires_at, home_scope: TEST_SCOPE })
			.eq('id', newId);
		expect(stampError).toBeNull();

		// 4. The guest can sign in and their context is corner-exclusive.
		const url = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
		const guestClient = createClient(url, process.env.PUBLIC_SUPABASE_ANON_KEY ?? '', {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { error: signInError } = await guestClient.auth.signInWithPassword({
			email: GUEST_EMAIL,
			password: GUEST_PASSWORD
		});
		expect(signInError).toBeNull();

		const { data: ctx } = await guestClient.rpc('get_my_access_context');
		expect(ctx?.[0].scopes).toEqual([TEST_SCOPE]);
		expect(ctx?.[0].home_scope).toBe(TEST_SCOPE);
		expect(ctx?.[0].home_region).toBe('amsterdam');
		expect(new Date(ctx?.[0].access_expires_at).toISOString()).toBe(
			new Date(accessEnd).toISOString()
		);

		// 5. Redemption counter moved exactly once.
		const { data: linkRow } = await admin
			.from('group_invite_links')
			.select('redemption_count')
			.eq('token', 'glj-flow')
			.single();
		expect(linkRow?.redemption_count).toBe(1);
	});

	it('compensating delete removes the partial account in FK order', async () => {
		const { data: created } = await admin.auth.admin.createUser({
			email: 'glink-partial@test.invalid',
			password: GUEST_PASSWORD,
			email_confirm: true,
			user_metadata: { username: 'glink-partial', berlin_based: false }
		});
		const id = created!.user!.id;

		// The join action's compensating order: profiles → identities → auth.
		const { error: profileDelError } = await admin.from('profiles').delete().eq('id', id);
		expect(profileDelError).toBeNull();
		const { error: identityDelError } = await admin.from('identities').delete().eq('id', id);
		expect(identityDelError).toBeNull();
		const { error: userDelError } = await admin.auth.admin.deleteUser(id);
		expect(userDelError).toBeNull();

		const { data: gone } = await admin
			.from('profiles')
			.select('id')
			.eq('id', id)
			.maybeSingle();
		expect(gone).toBeNull();
	});
});
