import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deriveGeneralArea, validateRegion } from './location.js';

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
			place_id: 'test', name: 'x', address: 'y', lat: 52.5, lng: 13.4
		});
		expect(result.generalArea).toBe('Kreuzberg');
	});

	it('falls through to "Berlin" when Nominatim returns 500', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('server error', { status: 500 })
		);
		const result = await deriveGeneralArea({
			place_id: 'test', name: 'x', address: 'y', lat: 52.5, lng: 13.4
		});
		expect(result.generalArea).toBe('Berlin');
		expect(result.centroidLat).toBe(52.5);
		expect(result.centroidLng).toBe(13.4);
	});

	it('falls through to "Berlin" when fetch throws (network failure)', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'));
		const result = await deriveGeneralArea({
			place_id: 'test', name: 'x', address: 'y', lat: 52.5, lng: 13.4
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
			place_id: 'test', name: 'x', address: 'y', lat: 52.5, lng: 13.4
		});

		// advance past the NOMINATIM_TIMEOUT_MS so the controller aborts
		await vi.advanceTimersByTimeAsync(7000);

		const result = await promise;
		expect(result.generalArea).toBe('Berlin');
		expect(console.error).toHaveBeenCalled();
	});
});

describe('validateRegion', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('accepts a Nominatim result inside the Berlin bbox', () => {
		expect(
			validateRegion({
				place_id: '12345',
				name: 'Café Aroma',
				address: 'Kreuzbergstr 1, 10965 Berlin',
				lat: 52.495,
				lng: 13.39
			})
		).toBe(true);
	});

	it('rejects a Nominatim result outside the Berlin bbox', () => {
		// e.g. a Friedrichshain in Saxony — geocoded outside Berlin
		expect(
			validateRegion({
				place_id: '99999',
				name: 'Friedrichshain (Saxony)',
				address: 'Friedrichshain, Sachsen, Germany',
				lat: 51.0,
				lng: 14.5
			})
		).toBe(false);
	});

	it('accepts a manual (free-text) location regardless of coords', () => {
		// Manual locations carry placeholder lat:0, lng:0 because the user
		// typed them without picking a Nominatim suggestion. Trust the input.
		expect(
			validateRegion({
				place_id: 'manual',
				name: 'Grünberger Straße 40, Friedrichshain',
				address: 'Grünberger Straße 40, Friedrichshain',
				lat: 0,
				lng: 0
			})
		).toBe(true);
	});

	it('rejects a non-manual location with placeholder lat:0,lng:0', () => {
		// Defends against a corrupted Nominatim result claiming (0,0) without
		// the manual marker.
		expect(
			validateRegion({
				place_id: 'somewhere',
				name: 'Null Island',
				address: 'Null Island',
				lat: 0,
				lng: 0
			})
		).toBe(false);
	});

	it('logs a structured trace when rejecting a non-manual location', () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		validateRegion({
			place_id: '99999',
			name: 'Outside',
			address: 'Outside',
			lat: 51.0,
			lng: 14.5
		});
		expect(errSpy).toHaveBeenCalled();
		const logged = errSpy.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
		expect(logged?.place_id).toBe('99999');
	});

	it('does not log when the location is a manual entry', () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		validateRegion({
			place_id: 'manual',
			name: 'Anywhere',
			address: 'Anywhere',
			lat: 0,
			lng: 0
		});
		expect(errSpy).not.toHaveBeenCalled();
	});
});
