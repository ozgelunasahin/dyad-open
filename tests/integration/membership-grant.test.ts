import { describe, it, expect, afterAll } from 'vitest';
import { createAdminClient, TEST_USERS } from '../helpers/auth.js';
import { SupabaseMembershipService } from '../../src/lib/services/membership.js';

/**
 * Operator grant/revoke (R5/AE4) at the data layer — replicates what
 * /admin/members/membership-api writes via the service-role client (the
 * endpoint itself imports $env, so it's unit-tested separately). Confirms a
 * comp grant is active with NO Stripe record, and revoke flips it inactive.
 */
const BEN = TEST_USERS.ben.id;

describe('operator membership grant/revoke', () => {
	const admin = createAdminClient();
	const service = new SupabaseMembershipService(admin);

	afterAll(async () => {
		await admin.from('memberships').delete().eq('identity_id', BEN);
	});

	it('grants a comp membership: active, no payment_ref, no Stripe ids', async () => {
		await admin.from('memberships').delete().eq('identity_id', BEN);
		await service.upsertMembership({ identity_id: BEN, source: 'comp', active: true });

		const { data } = await admin
			.from('memberships')
			.select('active, source, cadence, payment_ref, stripe_customer_id, stripe_subscription_id')
			.eq('identity_id', BEN)
			.maybeSingle();

		expect(data).toMatchObject({
			active: true,
			source: 'comp',
			cadence: null,
			payment_ref: null,
			stripe_customer_id: null,
			stripe_subscription_id: null
		});
	});

	it('revoke flips active to false (entitlement gone, row retained)', async () => {
		await service.updateMembership(BEN, { active: false });
		const { data } = await admin
			.from('memberships')
			.select('active, source')
			.eq('identity_id', BEN)
			.maybeSingle();
		expect(data).toMatchObject({ active: false, source: 'comp' });
	});
});
