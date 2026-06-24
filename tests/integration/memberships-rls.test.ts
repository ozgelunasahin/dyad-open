import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, createAuthenticatedClient, TEST_USERS } from '../helpers/auth.js';

/**
 * memberships — owner-only reads, service-role-only writes.
 *
 * A member may SELECT their own entitlement (the /membership page and the gate
 * read it) but has NO write grant, so a member can never self-INSERT
 * active=true or flip their own flag. Writes come only from the webhook /
 * operator grant via the service-role client.
 *
 * app.has_active_membership is an app-schema SECURITY DEFINER function that is
 * deliberately NOT PostgREST-exposed (exposing the app schema would publish
 * every internal helper). It is exercised functionally by the gating-
 * enforcement test and guarded statically by scripts/check-migrations.sh.
 */
describe('memberships — owner-only read, service-role-only write', () => {
	const admin = createAdminClient();
	let lisa: SupabaseClient;
	let marco: SupabaseClient;

	async function cleanup() {
		await admin
			.from('memberships')
			.delete()
			.in('identity_id', [TEST_USERS.lisa.id, TEST_USERS.marco.id]);
	}

	beforeAll(async () => {
		[lisa, marco] = await Promise.all([
			createAuthenticatedClient(TEST_USERS.lisa.email, TEST_USERS.lisa.password),
			createAuthenticatedClient(TEST_USERS.marco.email, TEST_USERS.marco.password)
		]);
		await cleanup();
		// A comp + lifetime-shaped entitlement for lisa: perpetual, no Stripe ids.
		const { error } = await admin
			.from('memberships')
			.insert({ identity_id: TEST_USERS.lisa.id, source: 'comp', cadence: 'lifetime', active: true });
		if (error) throw new Error(`setup failed: ${error.message}`);
	});

	afterAll(cleanup);

	it('lets a member read their own entitlement (lifetime row reads active)', async () => {
		const { data, error } = await lisa
			.from('memberships')
			.select('active, source, cadence, current_period_end, stripe_subscription_id')
			.eq('identity_id', TEST_USERS.lisa.id)
			.maybeSingle();
		expect(error, error?.message).toBeNull();
		expect(data).toMatchObject({
			active: true,
			source: 'comp',
			cadence: 'lifetime',
			current_period_end: null,
			stripe_subscription_id: null
		});
	});

	it("does not let a member read another member's entitlement", async () => {
		const { data, error } = await marco
			.from('memberships')
			.select('active')
			.eq('identity_id', TEST_USERS.lisa.id)
			.maybeSingle();
		expect(error, error?.message).toBeNull();
		expect(data).toBeNull(); // owner-only SELECT returns zero rows
	});

	it('does not let a member self-grant active membership (no INSERT grant)', async () => {
		const { error } = await marco
			.from('memberships')
			.insert({ identity_id: TEST_USERS.marco.id, source: 'comp', active: true });
		expect(error, 'REVOKE: authenticated has no INSERT on memberships').not.toBeNull();

		const { data } = await admin
			.from('memberships')
			.select('identity_id')
			.eq('identity_id', TEST_USERS.marco.id)
			.maybeSingle();
		expect(data).toBeNull(); // nothing was written
	});

	it('does not let a member grant membership to another actor', async () => {
		const { error } = await marco
			.from('memberships')
			.insert({ identity_id: TEST_USERS.lisa.id, source: 'comp', active: true });
		expect(error).not.toBeNull();
	});

	it('does not let a member flip their own active flag (no UPDATE grant)', async () => {
		// Give marco an inactive row via the service role, then try to self-activate.
		await admin
			.from('memberships')
			.insert({ identity_id: TEST_USERS.marco.id, source: 'paid', active: false });

		await marco.from('memberships').update({ active: true }).eq('identity_id', TEST_USERS.marco.id);

		const { data } = await admin
			.from('memberships')
			.select('active')
			.eq('identity_id', TEST_USERS.marco.id)
			.maybeSingle();
		expect(data?.active, 'no UPDATE grant — the flag must not change').toBe(false);
	});
});
