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

/** All four calls a single sync makes resolve OK by default. */
function configureFetchOk(fetchMock: ReturnType<typeof vi.fn>) {
	fetchMock.mockResolvedValue(fakeResponse({ ok: true }));
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

	it('adds the contact to the target segment and removes it from the other two', async () => {
		Object.assign(mockEnv, FULL_CONFIG);
		configureFetchOk(fetchMock);

		const result = await syncContactSegment('Person@Example.com', 'invited', {
			name: 'Pat Kim'
		});

		expect(result).toBe(true);

		const calls = fetchMock.mock.calls.map(([url, init]) => ({ url, method: init.method }));
		// 1 ensureContact POST + 1 name PATCH + 1 add + 2 removes
		expect(calls).toHaveLength(5);

		// Contact upsert — email lowercased, name split first/last, never /emails.
		const ensure = fetchMock.mock.calls[0];
		expect(ensure[0]).toBe('https://api.resend.com/contacts');
		expect(ensure[1].method).toBe('POST');
		const body = JSON.parse(ensure[1].body);
		expect(body.email).toBe('person@example.com');
		expect(body.first_name).toBe('Pat');
		expect(body.last_name).toBe('Kim');
		expect(body.unsubscribed).toBe(false);

		// Name is also PATCHed so it updates an already-present contact.
		expect(calls).toContainEqual({
			url: 'https://api.resend.com/contacts/person%40example.com',
			method: 'PATCH'
		});

		// Added to invited, removed from waitlist + member.
		expect(calls).toContainEqual({
			url: 'https://api.resend.com/contacts/person%40example.com/segments/seg_inv',
			method: 'POST'
		});
		expect(calls).toContainEqual({
			url: 'https://api.resend.com/contacts/person%40example.com/segments/seg_wait',
			method: 'DELETE'
		});
		expect(calls).toContainEqual({
			url: 'https://api.resend.com/contacts/person%40example.com/segments/seg_mem',
			method: 'DELETE'
		});

		// Never touches the send endpoint.
		expect(calls.some((c) => String(c.url).endsWith('/emails'))).toBe(false);
	});

	it('tolerates an already-present contact (409) and a not-in-segment remove (404)', async () => {
		Object.assign(mockEnv, FULL_CONFIG);
		fetchMock
			.mockResolvedValueOnce(fakeResponse({ ok: false, status: 409 })) // ensureContact
			.mockResolvedValueOnce(fakeResponse({ ok: true })) // add
			.mockResolvedValueOnce(fakeResponse({ ok: false, status: 404 })) // remove
			.mockResolvedValueOnce(fakeResponse({ ok: false, status: 404 })); // remove

		const result = await syncContactSegment('a@example.com', 'member');

		expect(result).toBe(true);
		// 409 and 404 are expected end states, not logged as errors.
		expect(console.error).not.toHaveBeenCalled();
	});

	it('removeFromAllSegments deletes from every managed segment', async () => {
		Object.assign(mockEnv, FULL_CONFIG);
		configureFetchOk(fetchMock);

		const result = await removeFromAllSegments('Gone@Example.com');

		expect(result).toBe(true);
		const methods = fetchMock.mock.calls.map(([, init]) => init.method);
		expect(methods).toEqual(['DELETE', 'DELETE', 'DELETE']);
		for (const [url] of fetchMock.mock.calls) {
			expect(String(url)).toContain('/contacts/gone%40example.com/segments/');
		}
	});
});
