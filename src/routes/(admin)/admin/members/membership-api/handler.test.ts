import { describe, it, expect, vi, beforeEach } from 'vitest';

const { state } = vi.hoisted(() => ({
	state: {
		profile: null as { id: string } | null,
		upsertError: null as { message: string } | null,
		updateError: null as { message: string } | null,
		captured: {} as { upsert?: Record<string, unknown>; onConflict?: string; update?: Record<string, unknown> }
	}
}));

vi.mock('$lib/server/supabase-admin', () => ({
	makeAdminClient: () => ({
		from() {
			const builder = {
				select: () => builder,
				eq: () => builder,
				maybeSingle: async () => ({ data: state.profile, error: null }),
				upsert: async (obj: Record<string, unknown>, opts?: { onConflict?: string }) => {
					state.captured.upsert = obj;
					state.captured.onConflict = opts?.onConflict;
					return { error: state.upsertError };
				},
				update: (patch: Record<string, unknown>) => {
					state.captured.update = patch;
					return builder;
				},
				then: (onF: (v: { error: unknown }) => unknown) =>
					Promise.resolve({ error: state.updateError }).then(onF)
			};
			return builder;
		}
	})
}));

const { POST, PATCH } = await import('./+server.js');

function call(method: 'POST' | 'PATCH', body: unknown) {
	const request = new Request('http://localhost/admin/members/membership-api', {
		method,
		body: JSON.stringify(body),
		headers: { 'content-type': 'application/json' }
	});
	const handler = method === 'POST' ? POST : PATCH;
	return handler({ request } as unknown as Parameters<typeof POST>[0]);
}

describe('admin membership grant/revoke API', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		state.profile = { id: 'identity-1' };
		state.upsertError = null;
		state.updateError = null;
		state.captured = {};
	});

	it('grants a comp membership: active, source=comp, no Stripe ids in the payload', async () => {
		const res = await call('POST', { username: 'lisa', source: 'comp' });
		expect(res.status).toBe(200);
		expect(state.captured.onConflict).toBe('identity_id');
		expect(state.captured.upsert).toMatchObject({ identity_id: 'identity-1', source: 'comp', active: true });
		expect(state.captured.upsert).not.toHaveProperty('payment_ref');
		expect(state.captured.upsert).not.toHaveProperty('stripe_customer_id');
	});

	it('rejects an ungrantable source (e.g. paid) with 400', async () => {
		const res = await call('POST', { username: 'lisa', source: 'paid' });
		expect(res.status).toBe(400);
		expect(state.captured.upsert).toBeUndefined();
	});

	it('rejects a missing username with 400', async () => {
		expect((await call('POST', { source: 'comp' })).status).toBe(400);
	});

	it('404s an unknown username with no write', async () => {
		state.profile = null;
		const res = await call('POST', { username: 'ghost', source: 'comp' });
		expect(res.status).toBe(404);
		expect(state.captured.upsert).toBeUndefined();
	});

	it('revokes via PATCH active:false', async () => {
		const res = await call('PATCH', { identity_id: 'identity-1', active: false });
		expect(res.status).toBe(200);
		expect(state.captured.update).toEqual({ active: false });
	});

	it('rejects PATCH active:true (revoke-only) with 400', async () => {
		const res = await call('PATCH', { identity_id: 'identity-1', active: true });
		expect(res.status).toBe(400);
		expect(state.captured.update).toBeUndefined();
	});

	it('rejects PATCH without identity_id with 400', async () => {
		expect((await call('PATCH', { active: false })).status).toBe(400);
	});
});
