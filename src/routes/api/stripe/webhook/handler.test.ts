import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

/**
 * Transport-layer tests for the Stripe webhook endpoint: signature
 * verification (real SubtleCrypto via the shared client), idempotency, and
 * status codes. The entitlement handlers are mocked here — their logic is
 * tested in membership-webhook.test.ts (U5). The DB-level service-role/REVOKE
 * posture of processed_stripe_events is tested in tests/integration.
 */

const { mockEnv, dispatchStripeEvent, store } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>,
	dispatchStripeEvent: vi.fn(),
	store: {
		seen: new Set<string>(),
		selectError: null as { message: string } | null,
		insertError: null as { code?: string; message: string } | null
	}
}));

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$lib/server/membership-webhook', () => ({ dispatchStripeEvent }));
vi.mock('$lib/server/supabase-admin', () => ({
	// In-memory stand-in for processed_stripe_events; mirrors the supabase-js
	// query-builder shape the endpoint uses.
	makeAdminClient: () => ({
		from() {
			let key: string | undefined;
			const builder = {
				select() {
					return builder;
				},
				eq(_col: string, val: string) {
					key = val;
					return builder;
				},
				async maybeSingle() {
					if (store.selectError) return { data: null, error: store.selectError };
					const present = key !== undefined && store.seen.has(key);
					return { data: present ? { stripe_event_id: key } : null, error: null };
				},
				async insert(row: { stripe_event_id: string }) {
					if (store.insertError) return { error: store.insertError };
					if (store.seen.has(row.stripe_event_id)) {
						return { error: { code: '23505', message: 'duplicate key' } };
					}
					store.seen.add(row.stripe_event_id);
					return { error: null };
				}
			};
			return builder;
		}
	})
}));

const { POST } = await import('./+server.js');

const SECRET = 'whsec_test_secret';
const signer = new Stripe('sk_test_dummy', { httpClient: Stripe.createFetchHttpClient() });

function call(req: Request) {
	return POST({ request: req } as unknown as Parameters<typeof POST>[0]);
}

function signed(eventObj: { id: string; type: string; [k: string]: unknown }): Request {
	const payload = JSON.stringify({ data: { object: {} }, ...eventObj });
	const sig = signer.webhooks.generateTestHeaderString({ payload, secret: SECRET });
	return new Request('http://localhost/api/stripe/webhook', {
		method: 'POST',
		body: payload,
		headers: { 'stripe-signature': sig, 'content-type': 'application/json' }
	});
}

const EVT = { id: 'evt_test_1', type: 'checkout.session.completed' };

describe('POST /api/stripe/webhook', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		for (const k of Object.keys(mockEnv)) delete mockEnv[k];
		mockEnv.STRIPE_WEBHOOK_SECRET = SECRET;
		mockEnv.STRIPE_SECRET_KEY = 'sk_test_dummy';
		store.seen.clear();
		store.selectError = null;
		store.insertError = null;
		dispatchStripeEvent.mockReset().mockResolvedValue(undefined);
	});

	it('accepts a valid-signature event, runs the handler once, and records the id', async () => {
		const res = await call(signed(EVT));
		expect(res.status).toBe(200);
		expect(dispatchStripeEvent).toHaveBeenCalledTimes(1);
		expect(dispatchStripeEvent.mock.calls[0][0].id).toBe('evt_test_1');
		expect(store.seen.has('evt_test_1')).toBe(true);
	});

	it('skips an already-processed event id without re-running the handler', async () => {
		store.seen.add('evt_test_1');
		const res = await call(signed(EVT));
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ duplicate: true });
		expect(dispatchStripeEvent).not.toHaveBeenCalled();
	});

	it('treats a concurrent insert PK collision as success (race-safe)', async () => {
		store.insertError = { code: '23505', message: 'duplicate key value' };
		const res = await call(signed(EVT));
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ duplicate: true });
		expect(dispatchStripeEvent).toHaveBeenCalledTimes(1); // handler ran; only the record raced
	});

	it('rejects an invalid signature with 400 and writes no row', async () => {
		const req = new Request('http://localhost/api/stripe/webhook', {
			method: 'POST',
			body: JSON.stringify(EVT),
			headers: { 'stripe-signature': 't=1,v1=deadbeef', 'content-type': 'application/json' }
		});
		const res = await call(req);
		expect(res.status).toBe(400);
		expect(dispatchStripeEvent).not.toHaveBeenCalled();
		expect(store.seen.size).toBe(0);
	});

	it('rejects a missing signature header with 400', async () => {
		const req = new Request('http://localhost/api/stripe/webhook', {
			method: 'POST',
			body: JSON.stringify(EVT)
		});
		const res = await call(req);
		expect(res.status).toBe(400);
		expect(dispatchStripeEvent).not.toHaveBeenCalled();
	});

	it('rejects an empty body with 400', async () => {
		const req = new Request('http://localhost/api/stripe/webhook', {
			method: 'POST',
			body: '',
			headers: { 'stripe-signature': 't=1,v1=abc' }
		});
		const res = await call(req);
		expect(res.status).toBe(400);
	});

	it('returns 5xx and writes no row when the handler throws (Stripe retries)', async () => {
		dispatchStripeEvent.mockRejectedValue(new Error('boom-internal'));
		const res = await call(signed(EVT));
		expect(res.status).toBe(500);
		expect(store.seen.has('evt_test_1')).toBe(false);
		expect(JSON.stringify(await res.json())).not.toContain('boom-internal');
	});

	it('returns 503 when the signing secret is not configured', async () => {
		delete mockEnv.STRIPE_WEBHOOK_SECRET;
		const res = await call(signed(EVT));
		expect(res.status).toBe(503);
		expect(dispatchStripeEvent).not.toHaveBeenCalled();
	});

	it('returns 5xx without leaking the DB error when the idempotency check fails', async () => {
		store.selectError = { message: 'pg-connection-refused' };
		const res = await call(signed(EVT));
		expect(res.status).toBe(500);
		expect(JSON.stringify(await res.json())).not.toContain('pg-connection-refused');
		expect(dispatchStripeEvent).not.toHaveBeenCalled();
	});

	it('200s for an event the dispatcher does not act on (routing is the dispatcher’s job)', async () => {
		const res = await call(signed({ id: 'evt_other', type: 'payment_intent.created' }));
		expect(res.status).toBe(200);
		expect(dispatchStripeEvent).toHaveBeenCalledTimes(1);
	});
});
