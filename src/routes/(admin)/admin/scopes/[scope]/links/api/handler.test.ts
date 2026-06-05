import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing the handler.
vi.mock('$env/static/public', () => ({ PUBLIC_SUPABASE_URL: 'http://localhost:54321' }));

const supabaseFromMock = vi.fn();
vi.mock('$lib/server/supabase-admin', () => ({
	makeAdminClient: () => ({ from: supabaseFromMock })
}));

// Import after mocks are wired so the handler resolves the mocked modules.
const { POST, PATCH } = await import('./+server.js');

const FUTURE = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
const PAST = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

function makeRequest(method: string, body: unknown): Request {
	return new Request('http://localhost/admin/scopes/test-corner/links/api', {
		method,
		headers: { 'content-type': 'application/json' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

// Build a chainable thenable that resolves to `{ data, error }`.
function chain(data: unknown, dbError: unknown = null) {
	const result = { data, error: dbError };
	const builder: Record<string, unknown> = {};
	const methods = ['select', 'eq', 'order', 'maybeSingle', 'update'];
	for (const m of methods) builder[m] = () => builder;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	builder.insert = vi.fn().mockResolvedValue(result);
	return builder;
}

const params = { scope: 'test-corner' };

describe('POST /admin/scopes/[scope]/links/api', () => {
	beforeEach(() => {
		supabaseFromMock.mockReset();
	});

	it('creates a link and returns the join URL', async () => {
		const insertChain = chain(null);
		supabaseFromMock
			.mockReturnValueOnce(chain({ scope: 'test-corner', retired_at: null })) // scopes lookup
			.mockReturnValueOnce(insertChain); // insert

		const res = await POST({
			params,
			request: makeRequest('POST', {
				label: 'Public Spaces 2026',
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48),
				max_redemptions: 100
			})
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(200);
		const body = await res.json();
		// Local env mock (PUBLIC_SUPABASE_URL=localhost) → joinOrigin falls back
		// to the dev origin regardless of region (conference hosts don't resolve
		// locally). Region→host routing itself is covered in app-origin.test.ts.
		expect(body.url).toMatch(/^http:\/\/localhost:5173\/join\?glink=/);
		expect(insertChain.insert).toHaveBeenCalledOnce();
		const inserted = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(inserted.scope).toBe('test-corner');
		expect(inserted.max_redemptions).toBe(100);
		expect(inserted.token).toBeTruthy();
	});

	it('rejects a join window that closes after access ends', async () => {
		const res = await POST({
			params,
			request: makeRequest('POST', {
				join_closes_at: FUTURE(48),
				access_expires_at: FUTURE(24)
			})
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
		expect(supabaseFromMock).not.toHaveBeenCalled();
	});

	it('rejects an access end in the past (dead link)', async () => {
		const res = await POST({
			params,
			request: makeRequest('POST', {
				join_closes_at: PAST(2),
				access_expires_at: PAST(1)
			})
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});

	it('rejects a non-positive or non-integer cap', async () => {
		for (const cap of [0, -1, 1.5, 'ten']) {
			const res = await POST({
				params,
				request: makeRequest('POST', {
					join_closes_at: FUTURE(24),
					access_expires_at: FUTURE(48),
					max_redemptions: cap
				})
			} as Parameters<typeof POST>[0]);
			expect(res.status).toBe(400);
		}
	});

	it('rejects malformed timestamps', async () => {
		const res = await POST({
			params,
			request: makeRequest('POST', {
				join_closes_at: 'tomorrow-ish',
				access_expires_at: FUTURE(48)
			})
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});

	it('404s for an unknown corner', async () => {
		supabaseFromMock.mockReturnValueOnce(chain(null));
		const res = await POST({
			params,
			request: makeRequest('POST', {
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48)
			})
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(404);
	});

	it('rejects a retired corner', async () => {
		supabaseFromMock.mockReturnValueOnce(
			chain({ scope: 'test-corner', retired_at: new Date().toISOString() })
		);
		const res = await POST({
			params,
			request: makeRequest('POST', {
				join_closes_at: FUTURE(24),
				access_expires_at: FUTURE(48)
			})
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});

	it('400s on malformed JSON', async () => {
		const res = await POST({
			params,
			request: makeRequest('POST', '{not json')
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});
});

describe('PATCH /admin/scopes/[scope]/links/api', () => {
	beforeEach(() => {
		supabaseFromMock.mockReset();
	});

	it('revokes a link', async () => {
		supabaseFromMock.mockReturnValueOnce(chain([{ id: 'link-1' }]));
		const res = await PATCH({
			params,
			request: makeRequest('PATCH', { id: 'link-1', revoked: true })
		} as Parameters<typeof PATCH>[0]);
		expect(res.status).toBe(200);
	});

	it('rejects a missing id or non-boolean revoked', async () => {
		const res1 = await PATCH({
			params,
			request: makeRequest('PATCH', { revoked: true })
		} as Parameters<typeof PATCH>[0]);
		expect(res1.status).toBe(400);

		const res2 = await PATCH({
			params,
			request: makeRequest('PATCH', { id: 'link-1', revoked: 'yes' })
		} as Parameters<typeof PATCH>[0]);
		expect(res2.status).toBe(400);
	});

	it('404s when the link does not belong to this corner', async () => {
		supabaseFromMock.mockReturnValueOnce(chain([]));
		const res = await PATCH({
			params,
			request: makeRequest('PATCH', { id: 'other-corner-link', revoked: true })
		} as Parameters<typeof PATCH>[0]);
		expect(res.status).toBe(404);
	});
});
