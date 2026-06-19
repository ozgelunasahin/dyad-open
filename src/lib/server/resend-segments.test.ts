import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mutable env the module under test reads at call time.
const { mockEnv } = vi.hoisted(() => ({
	mockEnv: {} as Record<string, string | undefined>
}));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

const { syncContactSegment, removeFromAllSegments, resendSegmentsConfigured } = await import(
	'./resend-segments.js'
);

function fakeResponse(init: { ok: boolean; status?: number; body?: string }): Response {
	return {
		ok: init.ok,
		status: init.status ?? (init.ok ? 200 : 500),
		text: async () => init.body ?? ''
	} as unknown as Response;
}

const FULL_CONFIG = {
	RESEND_API_KEY: 're_test',
	RESEND_SEGMENT_WAITLIST: 'seg_wait',
	RESEND_SEGMENT_INVITED: 'seg_inv',
	RESEND_SEGMENT_MEMBER: 'seg_mem'
};

/** Find calls by URL/method, order-independent. */
function calls(fetchMock: ReturnType<typeof vi.fn>) {
	return fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), method: init.method }));
}

describe('resend-segments', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('reports unconfigured until the key and all three segment ids are set', () => {
		expect(resendSegmentsConfigured()).toBe(false);
		Object.assign(mockEnv, { ...FULL_CONFIG, RESEND_SEGMENT_MEMBER: undefined });
		expect(resendSegmentsConfigured()).toBe(false);
		Object.assign(mockEnv, FULL_CONFIG);
		expect(resendSegmentsConfigured()).toBe(true);
	});

	it('no-ops without calling Resend when unconfigured', async () => {
		const result = await syncContactSegment('a@example.com', 'waitlist');
		expect(result).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('adds to the target and removes from the other two; email lowercased; never /emails', async () => {
		Object.assign(mockEnv, FULL_CONFIG);
		fetchMock.mockResolvedValue(fakeResponse({ ok: true }));

		const result = await syncContactSegment('Person@Example.com', 'invited');
		expect(result).toBe(true);

		const c = calls(fetchMock);
		// 1 ensureContact POST + 1 add + 2 removes (email-only — no name PATCH).
		expect(c).toHaveLength(4);

		const ensure = fetchMock.mock.calls[0];
		expect(ensure[0]).toBe('https://api.resend.com/contacts');
		expect(ensure[1].method).toBe('POST');
		const body = JSON.parse(ensure[1].body);
		expect(body).toEqual({ email: 'person@example.com', unsubscribed: false });
		expect(body.first_name).toBeUndefined();

		expect(c).toContainEqual({
			url: 'https://api.resend.com/contacts/person%40example.com/segments/seg_inv',
			method: 'POST'
		});
		expect(c).toContainEqual({
			url: 'https://api.resend.com/contacts/person%40example.com/segments/seg_wait',
			method: 'DELETE'
		});
		expect(c).toContainEqual({
			url: 'https://api.resend.com/contacts/person%40example.com/segments/seg_mem',
			method: 'DELETE'
		});
		expect(c.some((x) => x.url.endsWith('/emails'))).toBe(false);
	});

	it('returns false when a Resend call fails, and does NOT strip other segments on a failed add', async () => {
		Object.assign(mockEnv, FULL_CONFIG);
		// ensureContact ok, then the add to target fails.
		fetchMock
			.mockResolvedValueOnce(fakeResponse({ ok: true })) // ensureContact
			.mockResolvedValueOnce(fakeResponse({ ok: false, status: 500 })); // addToSegment

		const result = await syncContactSegment('a@example.com', 'member');
		expect(result).toBe(false);
		// Only the two calls happened — removals were skipped so the contact is
		// never left in zero segments.
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(calls(fetchMock).some((x) => x.method === 'DELETE')).toBe(false);
	});

	it('treats Resend 409/422 (already present) and 404 (already absent) as success', async () => {
		Object.assign(mockEnv, FULL_CONFIG);
		fetchMock
			.mockResolvedValueOnce(fakeResponse({ ok: false, status: 409 })) // ensureContact: exists
			.mockResolvedValueOnce(fakeResponse({ ok: false, status: 409 })) // add: already member
			.mockResolvedValue(fakeResponse({ ok: false, status: 404 })); // removes: not present
		const result = await syncContactSegment('a@example.com', 'waitlist');
		expect(result).toBe(true);
	});

	it('removeFromAllSegments deletes from all three and returns true', async () => {
		Object.assign(mockEnv, FULL_CONFIG);
		fetchMock.mockResolvedValue(fakeResponse({ ok: true }));
		const result = await removeFromAllSegments('a@example.com');
		expect(result).toBe(true);
		const deletes = calls(fetchMock).filter((x) => x.method === 'DELETE');
		expect(deletes).toHaveLength(3);
	});
});
