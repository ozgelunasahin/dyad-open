import type { LocationRef } from '$lib/domain/types.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'dyad.berlin/0.1 (contact@dyad.berlin)';
const RATE_LIMIT_MS = 1000;
const NOMINATIM_TIMEOUT_MS = 6000;

// Best-effort rate limit. On Cloudflare Workers, each isolate has its own
// memory, so this counter does NOT aggregate across isolates. Good enough to
// avoid self-inflicted bursts from a single request's sequential calls; not a
// defense against Nominatim's fair-use policy under concurrent load. For
// stricter rate-limiting, use a shared KV or Supabase counter.
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	if (elapsed < RATE_LIMIT_MS) {
		await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
	}
	lastRequestTime = Date.now();

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
	try {
		return await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': USER_AGENT,
				'Accept-Language': 'en'
			}
		});
	} finally {
		clearTimeout(timeoutId);
	}
}

export interface LocationSearchResult {
	place_id: string;
	name: string;
	address: string;
	lat: number;
	lng: number;
	neighbourhood: string | null;
}

interface NominatimSearchResult {
	place_id: number;
	display_name: string;
	lat: string;
	lon: string;
	address?: {
		road?: string;
		house_number?: string;
		suburb?: string;
		neighbourhood?: string;
		city_district?: string;
		city?: string;
		town?: string;
		village?: string;
		postcode?: string;
		country?: string;
	};
}

/** Search for places in a region using Nominatim. */
export async function searchLocations(
	query: string,
	region: string = 'berlin'
): Promise<LocationSearchResult[]> {
	if (query.trim().length < 2) return [];

	const viewbox = regionToViewbox(region);
	const params = new URLSearchParams({
		q: query,
		format: 'json',
		addressdetails: '1',
		limit: '5',
		bounded: '1',
		viewbox
	});

	let res: Response;
	try {
		res = await rateLimitedFetch(`${NOMINATIM_BASE}/search?${params}`);
	} catch (err) {
		console.error('[location] nominatim search failed:', err);
		return [];
	}
	if (!res.ok) {
		console.error('[location] nominatim search non-ok:', res.status);
		return [];
	}

	const data: NominatimSearchResult[] = await res.json();
	return data.map(toSearchResult);
}

/** Derive general area (neighbourhood name + centroid) from an exact location. */
export async function deriveGeneralArea(location: LocationRef): Promise<{
	generalArea: string;
	centroidLat: number;
	centroidLng: number;
}> {
	const params = new URLSearchParams({
		lat: String(location.lat),
		lon: String(location.lng),
		format: 'json',
		addressdetails: '1',
		zoom: '16' // neighbourhood level
	});

	let res: Response;
	try {
		res = await rateLimitedFetch(`${NOMINATIM_BASE}/reverse?${params}`);
	} catch (err) {
		// Timeout or network failure — do not block publish on an external geocoder.
		console.error('[location] nominatim reverse failed, falling through to generic area:', err);
		return {
			generalArea: 'Berlin',
			centroidLat: location.lat,
			centroidLng: location.lng
		};
	}
	if (!res.ok) {
		return {
			generalArea: 'Berlin',
			centroidLat: location.lat,
			centroidLng: location.lng
		};
	}

	const data: NominatimSearchResult = await res.json();
	const addr = data.address;
	const area =
		addr?.suburb || addr?.neighbourhood || addr?.city_district || addr?.postcode || 'Berlin';

	// Use the reverse-geocoded result's coordinates as the centroid
	// (this is the neighbourhood center, not the exact input location)
	return {
		generalArea: area,
		centroidLat: parseFloat(data.lat),
		centroidLng: parseFloat(data.lon)
	};
}

/** Marker used by LocationSearch when the user typed a free-text address that
 *  Nominatim didn't surface as a structured result. These have no real coords
 *  (lat: 0, lng: 0) so they can't be validated against a bbox — treat the
 *  user's intent as authoritative and accept them. */
const MANUAL_PLACE_ID = 'manual';

/** Check if a location falls within the expected region.
 *
 *  Free-text manual entries (place_id === 'manual') bypass the bbox check —
 *  the user typed the address explicitly, often because Nominatim returned no
 *  Berlin match (e.g. small cafés, recently-opened venues) or returned a
 *  geocoded result outside the bbox. Trust the user's intent over geocoding.
 *  Real Nominatim results are still bbox-checked. */
export function validateRegion(location: LocationRef, region: string = 'berlin'): boolean {
	if (location.place_id === MANUAL_PLACE_ID) return true;

	const bounds = regionBounds[region];
	if (!bounds) return false;
	const inside =
		location.lat >= bounds.south &&
		location.lat <= bounds.north &&
		location.lng >= bounds.west &&
		location.lng <= bounds.east;

	// Geocoding failures are the most common source of "outside region" rejects
	// for addresses that obviously belong (e.g. Nominatim returning a different
	// Friedrichshain). Log a structured trace so future reports can be diagnosed
	// without instrumenting the user.
	if (!inside) {
		console.error('[location] validateRegion rejected non-manual location:', {
			region,
			place_id: location.place_id,
			name: location.name,
			lat: location.lat,
			lng: location.lng
		});
	}

	return inside;
}

// Region definitions

const regionBounds: Record<string, { north: number; south: number; east: number; west: number }> = {
	berlin: { north: 52.68, south: 52.34, east: 13.76, west: 13.09 }
};

function regionToViewbox(region: string): string {
	const b = regionBounds[region] ?? regionBounds.berlin;
	return `${b.west},${b.north},${b.east},${b.south}`;
}

function toSearchResult(r: NominatimSearchResult): LocationSearchResult {
	const addr = r.address;
	const neighbourhood = addr?.suburb || addr?.neighbourhood || addr?.city_district || null;
	return {
		place_id: String(r.place_id),
		name: formatPlaceName(r),
		address: r.display_name,
		lat: parseFloat(r.lat),
		lng: parseFloat(r.lon),
		neighbourhood
	};
}

function formatPlaceName(r: NominatimSearchResult): string {
	const addr = r.address;
	if (!addr) return r.display_name.split(',').slice(0, 2).join(',').trim();

	const parts: string[] = [];
	if (addr.road) {
		parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
	}
	if (addr.suburb || addr.neighbourhood || addr.city_district) {
		parts.push(addr.suburb || addr.neighbourhood || addr.city_district || '');
	}
	return parts.length > 0 ? parts.join(', ') : r.display_name.split(',').slice(0, 2).join(',').trim();
}
