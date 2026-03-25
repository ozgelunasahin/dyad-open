import type { LocationRef } from '$lib/domain/types.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'dyad.berlin/0.1 (contact@dyad.berlin)';
const RATE_LIMIT_MS = 1000;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
	const now = Date.now();
	const elapsed = now - lastRequestTime;
	if (elapsed < RATE_LIMIT_MS) {
		await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
	}
	lastRequestTime = Date.now();
	return fetch(url, {
		headers: {
			'User-Agent': USER_AGENT,
			'Accept-Language': 'en'
		}
	});
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

	const res = await rateLimitedFetch(`${NOMINATIM_BASE}/search?${params}`);
	if (!res.ok) return [];

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

	const res = await rateLimitedFetch(`${NOMINATIM_BASE}/reverse?${params}`);
	if (!res.ok) {
		// Fallback: use the location itself with a generic area name
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

/** Check if a location falls within the expected region. */
export function validateRegion(location: LocationRef, region: string = 'berlin'): boolean {
	const bounds = regionBounds[region];
	if (!bounds) return false;
	return (
		location.lat >= bounds.south &&
		location.lat <= bounds.north &&
		location.lng >= bounds.west &&
		location.lng <= bounds.east
	);
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
