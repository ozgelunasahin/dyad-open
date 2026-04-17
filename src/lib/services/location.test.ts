import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deriveGeneralArea } from './location.js';

describe('deriveGeneralArea — Nominatim resilience', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
		fetchSpy?.mockRestore();
	});

	it('returns the neighbourhood when Nominatim responds successfully', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					lat: '52.5',
					lon: '13.4',
					address: { suburb: 'Kreuzberg' }
				}),
				{ status: 200 }
			)
		);
		const result = await deriveGeneralArea({
			name: 'x', address: 'y', lat: 52.5, lng: 13.4
		});
		expect(result.generalArea).toBe('Kreuzberg');
	});

	it('falls through to "Berlin" when Nominatim returns 500', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('server error', { status: 500 })
		);
		const result = await deriveGeneralArea({
			name: 'x', address: 'y', lat: 52.5, lng: 13.4
		});
		expect(result.generalArea).toBe('Berlin');
		expect(result.centroidLat).toBe(52.5);
		expect(result.centroidLng).toBe(13.4);
	});

	it('falls through to "Berlin" when fetch throws (network failure)', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'));
		const result = await deriveGeneralArea({
			name: 'x', address: 'y', lat: 52.5, lng: 13.4
		});
		expect(result.generalArea).toBe('Berlin');
		expect(console.error).toHaveBeenCalled();
	});

	it('falls through to "Berlin" when AbortController aborts the fetch (timeout)', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init?: RequestInit) => {
			// Simulate an abort-aware fetch: reject with AbortError when signal aborts.
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => {
					reject(new DOMException('Aborted', 'AbortError'));
				});
			});
		});

		const promise = deriveGeneralArea({
			name: 'x', address: 'y', lat: 52.5, lng: 13.4
		});

		// advance past the NOMINATIM_TIMEOUT_MS so the controller aborts
		await vi.advanceTimersByTimeAsync(7000);

		const result = await promise;
		expect(result.generalArea).toBe('Berlin');
		expect(console.error).toHaveBeenCalled();
	});
});
