import { describe, it, expect, beforeEach, vi } from 'vitest';

const supabaseFromMock = vi.fn();
vi.mock('$lib/server/supabase-admin', () => ({
	makeAdminClient: () => ({ from: supabaseFromMock })
}));

const { PATCH } = await import('./+server.js');

const FUTURE = new Date(Date.now() + 48 * 3600_000).toISOString();
const PAST = new Date(Date.now() - 48 * 3600_000).toISOString();

function makeRequest(body: unknown): Request {
	return new Request('http://localhost/admin/scopes/test-corner/api', {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

// Build a chainable thenable that resolves to `{ data, error }`.
function chain(data: unknown, dbError: unknown = null) {
	const result = { data, error: dbError };
	const builder: Record<string, unknown> = {};
	const calls: Record<string, unknown[][]> = {};
	for (const m of ['select', 'eq', 'not', 'maybeSingle']) {
		builder[m] = (...args: unknown[]) => {
			(calls[m] ??= []).push(args);
			return builder;
		};
	}
	const update = vi.fn((...args: unknown[]) => {
		(calls.update ??= []).push(args);
		return builder;
	});
	builder.update = update;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	builder._calls = calls;
	return builder as typeof builder & { _calls: typeof calls; update: typeof update };
}

const params = { scope: 'test-corner' };

describe('PATCH /admin/scopes/[scope]/api — guest actions', () => {
	beforeEach(() => {
		supabaseFromMock.mockReset();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('extend: stamps a future expiry on a guest of this corner', async () => {
		const c = chain([{ id: 'guest-1' }]);
		supabaseFromMock.mockReturnValueOnce(c);

		const res = await PATCH({
			params,
			request: makeRequest({ action: 'extend', identity_id: 'guest-1', access_expires_at: FUTURE })
		} as Parameters<typeof PATCH>[0]);

		expect(res.status).toBe(200);
		const updateArg = (c.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(updateArg.access_expires_at).toBe(FUTURE);
		// Target constrained to guests of this corner (id + home_scope).
		expect(c._calls.eq).toEqual([
			['id', 'guest-1'],
			['home_scope', 'test-corner']
		]);
	});

	it('extend: rejects a past timestamp', async () => {
		const res = await PATCH({
			params,
			request: makeRequest({ action: 'extend', identity_id: 'guest-1', access_expires_at: PAST })
		} as Parameters<typeof PATCH>[0]);
		expect(res.status).toBe(400);
		expect(supabaseFromMock).not.toHaveBeenCalled();
	});

	it('extend: 404s when the target is not a guest of this corner', async () => {
		supabaseFromMock.mockReturnValueOnce(chain([]));
		const res = await PATCH({
			params,
			request: makeRequest({ action: 'extend', identity_id: 'member-1', access_expires_at: FUTURE })
		} as Parameters<typeof PATCH>[0]);
		expect(res.status).toBe(404);
	});

	it('extend_all_guests: touches only this corner\'s stamped guests', async () => {
		const c = chain([{ id: 'g1' }, { id: 'g2' }]);
		supabaseFromMock.mockReturnValueOnce(c);

		const res = await PATCH({
			params,
			request: makeRequest({ action: 'extend_all_guests', access_expires_at: FUTURE })
		} as Parameters<typeof PATCH>[0]);

		expect(res.status).toBe(200);
		expect((await res.json()).extended).toBe(2);
		expect(c._calls.eq).toEqual([['home_scope', 'test-corner']]);
		expect(c._calls.not).toEqual([['access_expires_at', 'is', null]]);
	});

	it('convert: clears both guest fields, constrained to this corner', async () => {
		const c = chain([{ id: 'guest-1' }]);
		supabaseFromMock.mockReturnValueOnce(c);

		const res = await PATCH({
			params,
			request: makeRequest({ action: 'convert', identity_id: 'guest-1' })
		} as Parameters<typeof PATCH>[0]);

		expect(res.status).toBe(200);
		const updateArg = (c.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(updateArg).toEqual({ access_expires_at: null, home_scope: null });
		expect(c._calls.eq).toEqual([
			['id', 'guest-1'],
			['home_scope', 'test-corner']
		]);
	});

	it('set_region: sets a known region post-hoc and clears with null', async () => {
		const c = chain([{ scope: 'test-corner' }]);
		supabaseFromMock.mockReturnValueOnce(c);
		const res = await PATCH({
			params,
			request: makeRequest({ action: 'set_region', region: 'amsterdam' })
		} as Parameters<typeof PATCH>[0]);
		expect(res.status).toBe(200);
		expect((c.update as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
			region: 'amsterdam'
		});

		const c2 = chain([{ scope: 'test-corner' }]);
		supabaseFromMock.mockReturnValueOnce(c2);
		const res2 = await PATCH({
			params,
			request: makeRequest({ action: 'set_region', region: null })
		} as Parameters<typeof PATCH>[0]);
		expect(res2.status).toBe(200);
		expect((c2.update as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({ region: null });
	});

	it('set_region: rejects an unknown region key', async () => {
		const res = await PATCH({
			params,
			request: makeRequest({ action: 'set_region', region: 'atlantis' })
		} as Parameters<typeof PATCH>[0]);
		expect(res.status).toBe(400);
		expect(supabaseFromMock).not.toHaveBeenCalled();
	});

	it('rejects an unrecognized action instead of falling through to revoke', async () => {
		const res = await PATCH({
			params,
			request: makeRequest({ action: 'typo', identity_id: 'member-1', revoked: false })
		} as Parameters<typeof PATCH>[0]);
		expect(res.status).toBe(400);
		expect(supabaseFromMock).not.toHaveBeenCalled();
	});

	it('returns 500 with a generic message when the database update fails', async () => {
		for (const body of [
			{ action: 'extend', identity_id: 'g1', access_expires_at: FUTURE },
			{ action: 'extend_all_guests', access_expires_at: FUTURE },
			{ action: 'convert', identity_id: 'g1' }
		]) {
			supabaseFromMock.mockReturnValueOnce(chain(null, { message: 'boom' }));
			const res = await PATCH({
				params,
				request: makeRequest(body)
			} as Parameters<typeof PATCH>[0]);
			expect(res.status).toBe(500);
			expect((await res.json()).error).not.toContain('boom');
		}
	});

	it('legacy revoke/restore body still works (regression)', async () => {
		const c = chain(null);
		supabaseFromMock.mockReturnValueOnce(c);

		const res = await PATCH({
			params,
			request: makeRequest({ identity_id: 'member-1', revoked: true })
		} as Parameters<typeof PATCH>[0]);

		expect(res.status).toBe(200);
		const updateArg = (c.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(updateArg.revoked_at).toBeTruthy();
	});
});
