import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS
} from '../helpers/auth.js';

const TEST_SCOPE = 'group-links-test';

const FUTURE = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
const PAST = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

function createAnonClient(): SupabaseClient {
	const url = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
	const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
	return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function cleanTestData(admin: SupabaseClient): Promise<void> {
	await admin.from('group_invite_links').delete().eq('scope', TEST_SCOPE);
	await admin.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
	await admin.from('scopes').delete().eq('scope', TEST_SCOPE);
}

describe('Group invite links (U1)', () => {
	let admin: SupabaseClient;
	let memberClient: SupabaseClient;
	let anonClient: SupabaseClient;

	beforeAll(async () => {
		admin = createAdminClient();
		await cleanTestData(admin);
		await admin.from('scopes').insert({
			scope: TEST_SCOPE,
			name: 'Group links test corner',
			description: 'used by group-invite-links integration tests',
			created_by: SEED_USERS.digit.id,
			region: 'amsterdam'
		});
		memberClient = await createAuthenticatedClient(
			SEED_USERS.other.email,
			SEED_USERS.other.password
		);
		anonClient = createAnonClient();
	});

	afterAll(async () => {
		await cleanTestData(admin);
	});

	describe('table access posture', () => {
		it('service-role can INSERT a link', async () => {
			const { error } = await admin.from('group_invite_links').insert({
				token: 'glt-posture',
				scope: TEST_SCOPE,
				label: 'posture test',
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48)
			});
			expect(error).toBeNull();
		});

		it('rejects a join window that closes after access ends (CHECK)', async () => {
			const { error } = await admin.from('group_invite_links').insert({
				token: 'glt-bad-window',
				scope: TEST_SCOPE,
				join_closes_at: FUTURE(48),
				access_expires_at: FUTURE(24)
			});
			expect(error).not.toBeNull();
			expect(error?.code).toBe('23514'); // check_violation
		});

		it('rejects a non-positive redemption cap (CHECK)', async () => {
			const { error } = await admin.from('group_invite_links').insert({
				token: 'glt-bad-cap',
				scope: TEST_SCOPE,
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48),
				max_redemptions: 0
			});
			expect(error).not.toBeNull();
			expect(error?.code).toBe('23514');
		});

		it('authenticated client cannot SELECT links', async () => {
			const { data, error } = await memberClient
				.from('group_invite_links')
				.select('token')
				.eq('scope', TEST_SCOPE);
			// Revoked grants surface as an error; if PostgREST ever answers, RLS
			// (no policies) yields zero rows. Either way: nothing is readable.
			if (error) {
				expect(error).not.toBeNull();
			} else {
				expect(data ?? []).toHaveLength(0);
			}
		});

		it('anon client cannot SELECT links', async () => {
			const { data, error } = await anonClient
				.from('group_invite_links')
				.select('token')
				.eq('scope', TEST_SCOPE);
			if (error) {
				expect(error).not.toBeNull();
			} else {
				expect(data ?? []).toHaveLength(0);
			}
		});

		it('authenticated client cannot INSERT a link', async () => {
			const { data, error } = await memberClient
				.from('group_invite_links')
				.insert({
					token: 'glt-illegal',
					scope: TEST_SCOPE,
					join_closes_at: FUTURE(24),
					access_expires_at: FUTURE(48)
				})
				.select();
			expect(data ?? []).toHaveLength(0);
			if (!error) {
				const { count } = await admin
					.from('group_invite_links')
					.select('*', { count: 'exact', head: true })
					.eq('token', 'glt-illegal');
				expect(count).toBe(0);
			}
		});
	});

	describe('redeem_group_invite_link RPC', () => {
		it('is not callable by anon or authenticated roles', async () => {
			const { error: anonError } = await anonClient.rpc('redeem_group_invite_link', {
				p_token: 'glt-posture'
			});
			expect(anonError).not.toBeNull();

			const { error: memberError } = await memberClient.rpc('redeem_group_invite_link', {
				p_token: 'glt-posture'
			});
			expect(memberError).not.toBeNull();
		});

		it('redeems a valid link and increments the counter', async () => {
			const accessEnd = FUTURE(48);
			await admin.from('group_invite_links').insert({
				token: 'glt-happy',
				scope: TEST_SCOPE,
				join_closes_at: FUTURE(24),
				access_expires_at: accessEnd
			});

			const { data, error } = await admin.rpc('redeem_group_invite_link', {
				p_token: 'glt-happy'
			});
			expect(error).toBeNull();
			expect(data?.[0]?.scope).toBe(TEST_SCOPE);
			expect(new Date(data?.[0]?.access_expires_at).toISOString()).toBe(
				new Date(accessEnd).toISOString()
			);

			const { data: row } = await admin
				.from('group_invite_links')
				.select('redemption_count')
				.eq('token', 'glt-happy')
				.single();
			expect(row?.redemption_count).toBe(1);
		});

		it('rejects an unknown token', async () => {
			const { error } = await admin.rpc('redeem_group_invite_link', {
				p_token: 'glt-nope'
			});
			expect(error?.message).toContain('group_link_not_found');
		});

		it('rejects a revoked link', async () => {
			await admin.from('group_invite_links').insert({
				token: 'glt-revoked',
				scope: TEST_SCOPE,
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48),
				revoked_at: new Date().toISOString()
			});
			const { error } = await admin.rpc('redeem_group_invite_link', {
				p_token: 'glt-revoked'
			});
			expect(error?.message).toContain('group_link_revoked');
		});

		it('rejects a link whose join window has closed', async () => {
			await admin.from('group_invite_links').insert({
				token: 'glt-closed',
				scope: TEST_SCOPE,
				join_closes_at: PAST(2),
				access_expires_at: PAST(1)
			});
			const { error } = await admin.rpc('redeem_group_invite_link', {
				p_token: 'glt-closed'
			});
			expect(error?.message).toContain('group_link_closed');
		});

		it('rejects when the cap is reached', async () => {
			await admin.from('group_invite_links').insert({
				token: 'glt-capped',
				scope: TEST_SCOPE,
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48),
				max_redemptions: 1
			});

			const first = await admin.rpc('redeem_group_invite_link', { p_token: 'glt-capped' });
			expect(first.error).toBeNull();

			const second = await admin.rpc('redeem_group_invite_link', { p_token: 'glt-capped' });
			expect(second.error?.message).toContain('group_link_full');
		});

		it('concurrent redemptions racing the last slot: exactly one wins', async () => {
			await admin.from('group_invite_links').insert({
				token: 'glt-race',
				scope: TEST_SCOPE,
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48),
				max_redemptions: 1
			});

			const [a, b] = await Promise.all([
				admin.rpc('redeem_group_invite_link', { p_token: 'glt-race' }),
				admin.rpc('redeem_group_invite_link', { p_token: 'glt-race' })
			]);

			const failures = [a, b].filter((r) => r.error !== null);
			const successes = [a, b].filter((r) => r.error === null);
			expect(successes).toHaveLength(1);
			expect(failures).toHaveLength(1);
			expect(failures[0].error?.message).toContain('group_link_full');

			const { data: row } = await admin
				.from('group_invite_links')
				.select('redemption_count')
				.eq('token', 'glt-race')
				.single();
			expect(row?.redemption_count).toBe(1);
		});
	});
});
