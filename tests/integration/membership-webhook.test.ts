import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { createAdminClient, TEST_USERS } from '../helpers/auth.js';
import { dispatchStripeEvent } from '../../src/lib/server/membership-webhook.js';

/**
 * membership-webhook handlers — real DB writes (service-role) + a mocked Stripe.
 * The handler module imports no $env, so it runs in the integration harness; we
 * stub the Stripe API (re-fetch / cancel) and assert the resulting row state.
 */

const ID = TEST_USERS.lisa.id;
const PR = 'pr_webhook_itest';
const CUS = 'cus_webhook_itest';
const SUB = 'sub_webhook_itest';

const admin = createAdminClient();
type Dispatch = typeof dispatchStripeEvent;

const stripe = {
	subscriptions: { retrieve: vi.fn(), cancel: vi.fn() },
	charges: { retrieve: vi.fn() }
};
const deps = { admin, stripe } as unknown as Parameters<Dispatch>[1];

function dispatch(event: Record<string, unknown>) {
	return dispatchStripeEvent(event as unknown as Parameters<Dispatch>[0], deps);
}

function subscription(overrides: Record<string, unknown> = {}) {
	return {
		id: SUB,
		status: 'active',
		customer: CUS,
		metadata: { payment_ref: PR },
		items: { data: [{ price: { recurring: { interval: 'year' } }, current_period_end: 1893456000 }] },
		...overrides
	};
}

async function seed(patch: Record<string, unknown>) {
	const { error } = await admin
		.from('memberships')
		.upsert(
			{ identity_id: ID, source: 'paid', active: false, payment_ref: PR, ...patch },
			{ onConflict: 'identity_id' }
		);
	if (error) throw new Error(`seed failed: ${error.message}`);
}

async function readRow() {
	const { data } = await admin
		.from('memberships')
		.select('active, cadence, status, current_period_end, stripe_subscription_id, stripe_customer_id')
		.eq('identity_id', ID)
		.maybeSingle();
	return data;
}

describe('membership-webhook handlers', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		stripe.subscriptions.retrieve.mockReset();
		stripe.subscriptions.cancel.mockReset().mockResolvedValue({});
		stripe.charges.retrieve.mockReset();
		await admin.from('memberships').delete().eq('identity_id', ID);
	});

	afterAll(async () => {
		await admin.from('memberships').delete().eq('identity_id', ID);
	});

	it('checkout.session.completed (annual subscription) → active, cadence annual, period set', async () => {
		await seed({}); // pending row created at checkout time
		stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: 'active' }));

		await dispatch({
			id: 'evt_1',
			type: 'checkout.session.completed',
			data: { object: { mode: 'subscription', client_reference_id: PR, customer: CUS, subscription: SUB } }
		});

		const row = await readRow();
		expect(row).toMatchObject({
			active: true,
			cadence: 'annual',
			status: 'active',
			stripe_subscription_id: SUB,
			stripe_customer_id: CUS
		});
		expect(row?.current_period_end).not.toBeNull();
	});

	it('checkout.session.completed (lifetime payment) → active, no subscription, perpetual', async () => {
		await seed({});
		await dispatch({
			id: 'evt_2',
			type: 'checkout.session.completed',
			data: { object: { mode: 'payment', client_reference_id: PR, customer: CUS, subscription: null } }
		});

		const row = await readRow();
		expect(row).toMatchObject({
			active: true,
			cadence: 'lifetime',
			stripe_subscription_id: null,
			current_period_end: null,
			stripe_customer_id: CUS
		});
	});

	it('active subscriber buying lifetime cancels the prior subscription', async () => {
		await seed({ stripe_subscription_id: 'sub_old', active: true, cadence: 'annual' });
		await dispatch({
			id: 'evt_3',
			type: 'checkout.session.completed',
			data: { object: { mode: 'payment', client_reference_id: PR, customer: CUS, subscription: null } }
		});

		expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_old');
		const row = await readRow();
		expect(row).toMatchObject({ active: true, cadence: 'lifetime', stripe_subscription_id: null });
	});

	it('invoice.payment_failed → past_due keeps active true (Stripe grace, no bespoke logic)', async () => {
		await seed({ stripe_subscription_id: SUB, stripe_customer_id: CUS, active: true });
		stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: 'past_due' }));

		await dispatch({
			id: 'evt_4',
			type: 'invoice.payment_failed',
			data: { object: { subscription: SUB } }
		});

		const row = await readRow();
		expect(row).toMatchObject({ status: 'past_due', active: true });
	});

	it('customer.subscription.deleted → active false', async () => {
		await seed({ stripe_subscription_id: SUB, stripe_customer_id: CUS, active: true });
		stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: 'canceled' }));

		await dispatch({
			id: 'evt_5',
			type: 'customer.subscription.deleted',
			data: { object: { id: SUB } }
		});

		expect((await readRow())?.active).toBe(false);
	});

	it('full charge.refunded → revokes the lifetime entitlement', async () => {
		await seed({ stripe_customer_id: CUS, cadence: 'lifetime', active: true });
		await dispatch({
			id: 'evt_6',
			type: 'charge.refunded',
			data: { object: { refunded: true, customer: CUS } }
		});

		expect((await readRow())?.active).toBe(false);
	});

	it('charge.dispute.created → resolves the charge and revokes', async () => {
		await seed({ stripe_customer_id: CUS, cadence: 'lifetime', active: true });
		stripe.charges.retrieve.mockResolvedValue({ id: 'ch_1', customer: CUS });
		await dispatch({
			id: 'evt_7',
			type: 'charge.dispute.created',
			data: { object: { charge: 'ch_1' } }
		});

		expect((await readRow())?.active).toBe(false);
	});

	it('out-of-order subscription events converge (re-fetch is the source of truth)', async () => {
		await seed({ stripe_subscription_id: SUB, stripe_customer_id: CUS });
		stripe.subscriptions.retrieve.mockResolvedValue(subscription({ status: 'active' }));

		// updated arrives before created — both re-fetch the same current state.
		await dispatch({ id: 'evt_8a', type: 'customer.subscription.updated', data: { object: { id: SUB } } });
		await dispatch({ id: 'evt_8b', type: 'customer.subscription.created', data: { object: { id: SUB } } });

		expect((await readRow())).toMatchObject({ active: true, cadence: 'annual', status: 'active' });
	});

	it('a non-membership event is a no-op', async () => {
		await seed({ active: true, cadence: 'lifetime' });
		await dispatch({ id: 'evt_9', type: 'payment_intent.created', data: { object: {} } });
		expect((await readRow())?.active).toBe(true); // unchanged
	});
});
