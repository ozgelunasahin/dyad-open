import { describe, it, expect, afterAll } from 'vitest';
import { createAdminClient, createAuthenticatedClient, TEST_USERS } from '../helpers/auth.js';

/**
 * processed_stripe_events — the webhook idempotency ledger.
 *
 * Service-role only: RLS enabled with no policy + REVOKE ALL from
 * authenticated/anon. No member may read or write it; the PK dedups Stripe
 * redeliveries. (The endpoint transport — signature verification, status codes
 * — is unit-tested in src/routes/api/stripe/webhook/handler.test.ts.)
 */
describe('processed_stripe_events — service-role only, PK-deduped', () => {
	const admin = createAdminClient();
	const TEST_ID = `evt_itest_${Date.now()}`;

	afterAll(async () => {
		await admin.from('processed_stripe_events').delete().eq('stripe_event_id', TEST_ID);
	});

	it('blocks an authenticated member from reading the ledger (REVOKE enforced)', async () => {
		const marco = await createAuthenticatedClient(
			TEST_USERS.marco.email,
			TEST_USERS.marco.password
		);
		const { error } = await marco
			.from('processed_stripe_events')
			.select('stripe_event_id')
			.limit(1);
		expect(error, 'authenticated must not have SELECT on the ledger').not.toBeNull();
	});

	it('blocks an authenticated member from writing the ledger', async () => {
		const marco = await createAuthenticatedClient(
			TEST_USERS.marco.email,
			TEST_USERS.marco.password
		);
		const { error } = await marco
			.from('processed_stripe_events')
			.insert({ stripe_event_id: 'evt_hijack_attempt' });
		expect(error, 'authenticated must not have INSERT on the ledger').not.toBeNull();
	});

	it('lets the service role record an id once; the PK rejects a redelivery', async () => {
		const first = await admin
			.from('processed_stripe_events')
			.insert({ stripe_event_id: TEST_ID });
		expect(first.error, first.error?.message).toBeNull();

		const dup = await admin.from('processed_stripe_events').insert({ stripe_event_id: TEST_ID });
		expect(dup.error).not.toBeNull();
		expect(dup.error?.code).toBe('23505'); // unique_violation — idempotency holds
	});
});
