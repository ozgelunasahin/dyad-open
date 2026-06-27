import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEnv, createStripeClient, makeAdminClient, ensurePaymentRef, sessionCreate, adminState } =
	vi.hoisted(() => {
		const sessionCreate = vi.fn();
		const adminState = { existing: null as Record<string, unknown> | null };
		return {
			mockEnv: {} as Record<string, string | undefined>,
			sessionCreate,
			adminState,
			createStripeClient: vi.fn((key?: string) => {
				if (!key) throw new Error('missing key');
				return { checkout: { sessions: { create: sessionCreate } } };
			}),
			makeAdminClient: vi.fn(() => ({
				from: () => ({
					select() {
						return this;
					},
					eq() {
						return this;
					},
					maybeSingle: async () => ({ data: adminState.existing, error: null })
				})
			})),
			ensurePaymentRef: vi.fn(async () => 'pr_fixed')
		};
	});

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$lib/server/stripe', () => ({ createStripeClient }));
vi.mock('$lib/server/supabase-admin', () => ({ makeAdminClient }));
vi.mock('$lib/server/stripe-customer', () => ({ ensurePaymentRef }));

const { POST } = await import('./+server.js');

function call(bodyObj: unknown, user: { id: string } | null = { id: 'actor-1' }) {
	const request = new Request('http://localhost/api/membership/checkout', {
		method: 'POST',
		body: JSON.stringify(bodyObj),
		headers: { 'content-type': 'application/json' }
	});
	return POST({
		request,
		locals: { user },
		url: new URL('http://localhost/api/membership/checkout')
	} as unknown as Parameters<typeof POST>[0]);
}

describe('POST /api/membership/checkout', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		for (const k of Object.keys(mockEnv)) delete mockEnv[k];
		mockEnv.STRIPE_SECRET_KEY = 'sk_test_x';
		mockEnv.STRIPE_PRICE_ID_MONTHLY = 'price_m';
		mockEnv.STRIPE_PRICE_ID_ANNUAL = 'price_a';
		mockEnv.STRIPE_PRICE_ID_LIFETIME = 'price_l';
		adminState.existing = null;
		sessionCreate.mockReset().mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/x' });
		ensurePaymentRef.mockReset().mockResolvedValue('pr_fixed');
		createStripeClient.mockClear();
	});

	it('annual → subscription Session bound to the opaque payment_ref', async () => {
		const res = await call({ cadence: 'annual' });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/x' });
		const arg = sessionCreate.mock.calls[0][0];
		expect(arg.mode).toBe('subscription');
		expect(arg.line_items).toEqual([{ price: 'price_a', quantity: 1 }]);
		expect(arg.client_reference_id).toBe('pr_fixed');
		expect(arg.subscription_data).toEqual({ metadata: { payment_ref: 'pr_fixed' } });
	});

	it('lifetime → payment Session, no subscription_data', async () => {
		const res = await call({ cadence: 'lifetime' });
		expect(res.status).toBe(200);
		const arg = sessionCreate.mock.calls[0][0];
		expect(arg.mode).toBe('payment');
		expect(arg.line_items).toEqual([{ price: 'price_l', quantity: 1 }]);
		expect(arg.subscription_data).toBeUndefined();
	});

	it('never sends the actor id to Stripe (pseudonym only)', async () => {
		await call({ cadence: 'monthly' }, { id: 'actor-1' });
		expect(JSON.stringify(sessionCreate.mock.calls[0][0])).not.toContain('actor-1');
	});

	it('blocks lifetime while a live subscription exists → 409', async () => {
		adminState.existing = { stripe_subscription_id: 'sub_1', active: true };
		const res = await call({ cadence: 'lifetime' });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ error: 'cancel_subscription_first' });
		expect(sessionCreate).not.toHaveBeenCalled();
	});

	it('rejects an invalid cadence with 400', async () => {
		const res = await call({ cadence: 'weekly' });
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ error: 'invalid_cadence' });
	});

	it('400 cadence_unavailable when the cadence has no configured Price', async () => {
		delete mockEnv.STRIPE_PRICE_ID_ANNUAL;
		const res = await call({ cadence: 'annual' });
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ error: 'cadence_unavailable' });
	});

	it('503 when the Stripe secret key is not configured', async () => {
		delete mockEnv.STRIPE_SECRET_KEY;
		const res = await call({ cadence: 'annual' });
		expect(res.status).toBe(503);
	});

	it('401 when unauthenticated', async () => {
		await expect(call({ cadence: 'annual' }, null)).rejects.toMatchObject({ status: 401 });
	});
});
