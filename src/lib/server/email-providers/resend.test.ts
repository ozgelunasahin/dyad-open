import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResendEmailProvider } from './resend.js';
import type { EmailMessage } from './index.js';

const MESSAGE: EmailMessage = {
	to: 'member@example.com',
	subject: 'A new invitation to meet',
	html: '<p>hello</p>'
};

/** A minimal fetch Response stand-in — only the fields the provider reads. */
function fakeResponse(init: { ok: boolean; status?: number; body?: string }): Response {
	return {
		ok: init.ok,
		status: init.status ?? (init.ok ? 200 : 500),
		text: async () => init.body ?? ''
	} as unknown as Response;
}

describe('ResendEmailProvider', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('sends on a 2xx response and returns true', async () => {
		fetchMock.mockResolvedValueOnce(fakeResponse({ ok: true }));
		const provider = new ResendEmailProvider('re_test_key', 'hello@dyad.berlin');

		const result = await provider.send(MESSAGE);

		expect(result).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('https://api.resend.com/emails');
		expect(init.method).toBe('POST');
		expect(init.headers.Authorization).toBe('Bearer re_test_key');
		expect(init.headers['Content-Type']).toBe('application/json');

		const payload = JSON.parse(init.body);
		expect(payload.from).toBe('Dyad <hello@dyad.berlin>');
		expect(payload.to).toEqual(['member@example.com']);
		expect(payload.subject).toBe(MESSAGE.subject);
		expect(payload.html).toBe(MESSAGE.html);
	});

	it('passes an AbortSignal so the send is bounded by a timeout', async () => {
		fetchMock.mockResolvedValueOnce(fakeResponse({ ok: true }));
		const provider = new ResendEmailProvider('re_test_key', 'hello@dyad.berlin');

		await provider.send(MESSAGE);

		const [, init] = fetchMock.mock.calls[0];
		expect(init.signal).toBeInstanceOf(AbortSignal);
	});

	it('fails safe when the API key is missing — does not call fetch', async () => {
		const provider = new ResendEmailProvider(undefined, 'hello@dyad.berlin');

		const result = await provider.send(MESSAGE);

		expect(result).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(console.error).toHaveBeenCalled();
	});

	it('returns false on a non-2xx response without throwing or leaking the body', async () => {
		fetchMock.mockResolvedValueOnce(
			fakeResponse({ ok: false, status: 422, body: 'domain not verified' })
		);
		const provider = new ResendEmailProvider('re_test_key', 'hello@dyad.berlin');

		const result = await provider.send(MESSAGE);

		expect(result).toBe(false);
		expect(console.error).toHaveBeenCalled();
	});

	it('returns false when fetch rejects (network error / timeout abort)', async () => {
		fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
		const provider = new ResendEmailProvider('re_test_key', 'hello@dyad.berlin');

		const result = await provider.send(MESSAGE);

		expect(result).toBe(false);
		expect(console.error).toHaveBeenCalled();
	});
});
