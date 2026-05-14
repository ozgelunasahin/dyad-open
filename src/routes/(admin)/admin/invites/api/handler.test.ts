import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing the handler.
vi.mock('$env/static/public', () => ({ PUBLIC_SUPABASE_URL: 'http://localhost:54321' }));

const sendEmailMock = vi.fn().mockResolvedValue(true);
vi.mock('$lib/server/email.js', () => ({ sendEmail: sendEmailMock }));

// makeAdminClient builds a thenable chain. Each test sets supabaseFromMock to
// the row shape it wants the first `from()` call to return.
const supabaseFromMock = vi.fn();
vi.mock('$lib/server/supabase-admin', () => ({
	makeAdminClient: () => ({ from: supabaseFromMock })
}));

// Import after mocks are wired so the handler resolves the mocked modules.
const { POST } = await import('./+server.js');

function makeRequest(body: Record<string, unknown>): Request {
	return new Request('http://localhost/admin/invites/api', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

// Build a chainable thenable that resolves to `{ data, error }`.
function chain(data: unknown, dbError: unknown = null) {
	const result = { data, error: dbError };
	const builder: Record<string, unknown> = {};
	const methods = ['select', 'eq', 'is', 'not', 'gt', 'limit', 'order', 'maybeSingle'];
	for (const m of methods) builder[m] = () => builder;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	builder.insert = vi.fn().mockResolvedValue(result);
	return builder;
}

describe('POST /admin/invites/api — signature overrides reach the renderer', () => {
	beforeEach(() => {
		sendEmailMock.mockClear();
		supabaseFromMock.mockReset();
	});

	it('forwards overrides on the new-invite path (no pre-existing invitation)', async () => {
		// Sequence: select existing (empty) → select used (empty) → insert (ok).
		supabaseFromMock
			.mockReturnValueOnce(chain([])) // existing pending
			.mockReturnValueOnce(chain([])) // already-used check
			.mockReturnValueOnce(chain(null)); // insert

		const res = await POST({
			request: makeRequest({
				email: 'new@example.com',
				signatureClosing: 'Yours always,',
				signatureNames: 'Theodore'
			})
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(200);
		expect(sendEmailMock).toHaveBeenCalledOnce();
		const html = sendEmailMock.mock.calls[0][0].html as string;
		expect(html).toContain('Yours always,');
		expect(html).toContain('Theodore');
		expect(html).not.toContain('With care and joy,');
		expect(html).not.toContain('Luna and Fiore');
	});

	it('forwards overrides on the resend path (pre-existing invitation)', async () => {
		supabaseFromMock.mockReturnValueOnce(
			chain([
				{
					id: 'inv-1',
					token: 'token-abc',
					expires_at: new Date(Date.now() + 86_400_000).toISOString(),
					used_at: null
				}
			])
		);

		const res = await POST({
			request: makeRequest({
				email: 'existing@example.com',
				signatureClosing: 'In friendship,',
				signatureNames: 'Fiore'
			})
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(200);
		expect(sendEmailMock).toHaveBeenCalledOnce();
		const html = sendEmailMock.mock.calls[0][0].html as string;
		expect(html).toContain('In friendship,');
		expect(html).toContain('Fiore');
	});

	it('uses default signature when overrides are omitted (new-invite path)', async () => {
		supabaseFromMock
			.mockReturnValueOnce(chain([]))
			.mockReturnValueOnce(chain([]))
			.mockReturnValueOnce(chain(null));

		const res = await POST({
			request: makeRequest({ email: 'plain@example.com' })
		} as Parameters<typeof POST>[0]);

		expect(res.status).toBe(200);
		const html = sendEmailMock.mock.calls[0][0].html as string;
		expect(html).toContain('With care and joy,');
		expect(html).toContain('Luna and Fiore');
	});
});
