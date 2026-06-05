import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	deriveGeneralArea,
	searchLocations,
	validateRegion,
	regionLabel,
	regionMapCenter,
	resolveViewRegion,
	REGIONS
} from './location.js';

describe('searchLocations — Photon mapping and resilience', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		fetchSpy?.mockRestore();
	});

	it('maps a Photon Feature into LocationSearchResult shape', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					features: [
						{
							type: 'Feature',
							geometry: { type: 'Point', coordinates: [13.39, 52.495] },
							properties: {
								osm_id: 12345,
								osm_type: 'N',
								name: 'Flying Roasters',
								street: 'Gneisenaustraße',
								housenumber: '85',
								postcode: '10961',
								city: 'Berlin',
								district: 'Kreuzberg'
							}
						}
					]
				}),
				{ status: 200 }
			)
		);
		const results = await searchLocations('flying roast');
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			place_id: 'N12345',
			name: 'Flying Roasters',
			lat: 52.495,
			lng: 13.39,
			neighbourhood: 'Kreuzberg'
		});
		expect(results[0].address).toContain('Gneisenaustraße 85');
	});

	it('falls back to street + housenumber when properties.name is absent', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					features: [
						{
							type: 'Feature',
							geometry: { type: 'Point', coordinates: [13.4, 52.5] },
							properties: {
								osm_id: 999,
								osm_type: 'W',
								street: 'Skalitzer Straße',
								housenumber: '85a',
								city: 'Berlin'
							}
						}
					]
				}),
				{ status: 200 }
			)
		);
		const results = await searchLocations('skalitzer');
		expect(results[0].name).toBe('Skalitzer Straße 85a');
		expect(results[0].place_id).toBe('W999');
	});

	it('returns [] when query is shorter than 2 chars (no fetch)', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
		const results = await searchLocations('a');
		expect(results).toEqual([]);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('returns [] when Photon returns 500', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('server error', { status: 500 })
		);
		const results = await searchLocations('flying roast');
		expect(results).toEqual([]);
	});

	it('returns [] when fetch throws (network failure)', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'));
		const results = await searchLocations('flying roast');
		expect(results).toEqual([]);
		expect(console.error).toHaveBeenCalled();
	});

	it('passes a Berlin bbox and lang=en to Photon', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ features: [] }), { status: 200 })
		);
		await searchLocations('test');
		const calledUrl = (fetchSpy.mock.calls[0]?.[0] as string) ?? '';
		expect(calledUrl).toContain('photon.komoot.io');
		expect(calledUrl).toContain('lang=en');
		expect(calledUrl).toContain('bbox=13.09%2C52.34%2C13.76%2C52.68');
	});

	it('passes the Amsterdam bbox when region=amsterdam', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ features: [] }), { status: 200 })
		);
		await searchLocations('test', 'amsterdam');
		const calledUrl = (fetchSpy.mock.calls[0]?.[0] as string) ?? '';
		expect(calledUrl).toContain('bbox=4.72%2C52.28%2C5.08%2C52.43');
	});

	it('falls back to the Berlin bbox for an unknown region', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ features: [] }), { status: 200 })
		);
		await searchLocations('test', 'atlantis');
		const calledUrl = (fetchSpy.mock.calls[0]?.[0] as string) ?? '';
		expect(calledUrl).toContain('bbox=13.09%2C52.34%2C13.76%2C52.68');
	});
});

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

	it('falls through to "Amsterdam" for region=amsterdam, never "Berlin"', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('server error', { status: 500 })
		);
		const result = await deriveGeneralArea(
			{ place_id: 'test', name: 'x', address: 'y', lat: 52.37, lng: 4.9 },
			'amsterdam'
		);
		expect(result.generalArea).toBe('Amsterdam');
	});

	it('uses the region label when Nominatim returns no usable neighbourhood', async () => {
		fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ lat: '52.37', lon: '4.9', address: {} }), { status: 200 })
		);
		const result = await deriveGeneralArea(
			{ place_id: 'test', name: 'x', address: 'y', lat: 52.37, lng: 4.9 },
			'amsterdam'
		);
		expect(result.generalArea).toBe('Amsterdam');
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

	it('accepts a central-Amsterdam location for region=amsterdam', () => {
		expect(
			validateRegion(
				{ place_id: 'N1', name: 'De Ceuvel', address: 'Amsterdam-Noord', lat: 52.37, lng: 4.9 },
				'amsterdam'
			)
		).toBe(true);
	});

	it('rejects a Berlin location for region=amsterdam (and vice versa)', () => {
		expect(
			validateRegion(
				{ place_id: 'N2', name: 'Café Aroma', address: 'Berlin', lat: 52.495, lng: 13.39 },
				'amsterdam'
			)
		).toBe(false);
		expect(
			validateRegion(
				{ place_id: 'N3', name: 'De Ceuvel', address: 'Amsterdam', lat: 52.37, lng: 4.9 },
				'berlin'
			)
		).toBe(false);
	});
});

describe('region registry', () => {
	it('labels known regions and falls back for unknown/null keys', () => {
		expect(regionLabel('berlin')).toBe('Berlin');
		expect(regionLabel('amsterdam')).toBe('Amsterdam');
		expect(regionLabel('atlantis')).toBe('Berlin');
		expect(regionLabel(null)).toBe('Berlin');
		expect(regionLabel(undefined)).toBe('Berlin');
	});

	it('returns [lat, lng] map centers inside each region\'s own bounds', () => {
		for (const [key, def] of Object.entries(REGIONS)) {
			const [lat, lng] = regionMapCenter(key);
			expect(lat).toBeGreaterThan(def.bounds.south);
			expect(lat).toBeLessThan(def.bounds.north);
			expect(lng).toBeGreaterThan(def.bounds.west);
			expect(lng).toBeLessThan(def.bounds.east);
		}
	});

	it('falls back to the Berlin center for unknown regions', () => {
		expect(regionMapCenter('atlantis')).toEqual(REGIONS.berlin.center);
	});
});

describe('resolveViewRegion', () => {
	it('a guest is pinned to their corner region regardless of host', () => {
		expect(
			resolveViewRegion({ homeScope: 'conf', homeRegion: 'amsterdam', hostRegion: 'berlin' })
		).toBe('amsterdam');
		expect(
			resolveViewRegion({ homeScope: 'conf', homeRegion: 'amsterdam', hostRegion: null })
		).toBe('amsterdam');
	});

	it('a member follows the host region (dyad.amsterdam → amsterdam)', () => {
		expect(
			resolveViewRegion({ homeScope: null, homeRegion: null, hostRegion: 'amsterdam' })
		).toBe('amsterdam');
	});

	it('a member on the default host gets the default region', () => {
		expect(resolveViewRegion({ homeScope: null, homeRegion: null, hostRegion: null })).toBe(
			'berlin'
		);
	});

	it('a guest with a region-less corner falls back to default', () => {
		expect(
			resolveViewRegion({ homeScope: 'conf', homeRegion: null, hostRegion: 'amsterdam' })
		).toBe('berlin');
	});
});
