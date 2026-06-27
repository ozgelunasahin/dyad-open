import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensurePaymentRef, getOrCreateStripeCustomer } from './stripe-customer.js';

interface AdminState {
	selectRow: Record<string, unknown> | null;
	insertError?: { message: string } | null;
	updateError?: { message: string } | null;
	inserts: Record<string, unknown>[];
	updates: Record<string, unknown>[];
}

function makeAdmin(partial: Partial<AdminState>): { client: SupabaseClient; state: AdminState } {
	const state: AdminState = { selectRow: null, inserts: [], updates: [], ...partial };
	const client = {
		from() {
			const builder = {
				select: () => builder,
				eq: () => builder,
				maybeSingle: async () => ({ data: state.selectRow, error: null }),
				insert: async (rows: Record<string, unknown>) => {
					state.inserts.push(rows);
					return { error: state.insertError ?? null };
				},
				update: (patch: Record<string, unknown>) => {
					state.updates.push(patch);
					return builder;
				},
				// update().eq() is awaited for its {error}; make the builder thenable.
				then: (onF: (v: { error: unknown }) => unknown) =>
					Promise.resolve({ error: state.updateError ?? null }).then(onF)
			};
			return builder;
		}
	} as unknown as SupabaseClient;
	return { client, state };
}

describe('ensurePaymentRef', () => {
	beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

	it('returns the existing payment_ref without writing', async () => {
		const { client, state } = makeAdmin({ selectRow: { payment_ref: 'pr_existing' } });
		expect(await ensurePaymentRef(client, 'u1')).toBe('pr_existing');
		expect(state.inserts).toEqual([]);
		expect(state.updates).toEqual([]);
	});

	it('fills in payment_ref on an existing row without clobbering it', async () => {
		const { client, state } = makeAdmin({ selectRow: { payment_ref: null, source: 'comp' } });
		const ref = await ensurePaymentRef(client, 'u1');
		expect(ref).toMatch(/^pr_/);
		expect(state.updates).toEqual([{ payment_ref: ref }]); // only payment_ref touched
		expect(state.inserts).toEqual([]);
	});

	it('inserts a pending paid row when none exists', async () => {
		const { client, state } = makeAdmin({ selectRow: null });
		const ref = await ensurePaymentRef(client, 'u1');
		expect(ref).toMatch(/^pr_/);
		expect(state.inserts[0]).toMatchObject({
			identity_id: 'u1',
			source: 'paid',
			active: false,
			payment_ref: ref
		});
	});

	it('throws when the insert fails and no row can be re-read (no race winner)', async () => {
		const { client } = makeAdmin({ selectRow: null, insertError: { message: 'boom' } });
		await expect(ensurePaymentRef(client, 'u1')).rejects.toThrow(/payment_ref insert failed/);
	});
});

describe('getOrCreateStripeCustomer', () => {
	beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

	it('returns the existing customer id without calling Stripe', async () => {
		const { client } = makeAdmin({ selectRow: { stripe_customer_id: 'cus_existing' } });
		const stripe = { customers: { create: vi.fn() } } as unknown as import('stripe').default;
		expect(await getOrCreateStripeCustomer('u1', stripe, client)).toBe('cus_existing');
		expect((stripe.customers.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
	});

	it('creates a Customer with ONLY the opaque payment_ref — no email/name/address', async () => {
		const { client, state } = makeAdmin({
			selectRow: { stripe_customer_id: null, payment_ref: 'pr_existing' }
		});
		const create = vi.fn().mockResolvedValue({ id: 'cus_new' });
		const stripe = { customers: { create } } as unknown as import('stripe').default;

		const id = await getOrCreateStripeCustomer('u1', stripe, client);
		expect(id).toBe('cus_new');
		// Exactly metadata — toEqual proves there is no email/name/address key.
		expect(create.mock.calls[0][0]).toEqual({ metadata: { payment_ref: 'pr_existing' } });
		// Idempotency key derives from payment_ref, never the actor id.
		expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: 'membership-customer:pr_existing' });
		expect(state.updates).toEqual([{ stripe_customer_id: 'cus_new' }]);
	});
});
