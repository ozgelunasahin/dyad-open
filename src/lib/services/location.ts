import type { LocationRef } from '$lib/domain/types.js';

// Two geocoders, one per direction:
//
// - Photon (komoot, OSM-based) for forward search. Photon runs Elasticsearch
//   over the OSM extract and is built for prefix and fuzzy autocomplete, so
//   "flying roast" matches "Flying Roasters" the way users expect from a place
//   picker. Nominatim's full-text matcher requires near-exact substrings.
// - Nominatim for reverse geocoding (point -> neighbourhood name). Photon's
//   reverse endpoint exists but Nominatim's is what `deriveGeneralArea` is
//   tuned for, and it isn't part of the user complaint.
//
// Both are free OSM-based services. Self-hosting either is straightforward
// later if rate limits become a concern.

const PHOTON_BASE = 'https://photon.komoot.io';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'dyad.berlin/0.1 (contact@dyad.berlin)';
const NOMINATIM_RATE_LIMIT_MS = 1000;
const FETCH_TIMEOUT_MS = 6000;

// Best-effort rate limit for Nominatim's fair-use policy. Per-isolate on
// Cloudflare Workers, so this does not aggregate across isolates -- it only
// avoids self-inflicted bursts from a single request's sequential calls.
let lastNominatimRequestTime = 0;

async function nominatimFetch(url: string): Promise<Response> {
	const now = Date.now();
	const elapsed = now - lastNominatimRequestTime;
	if (elapsed < NOMINATIM_RATE_LIMIT_MS) {
		await new Promise((resolve) => setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS - elapsed));
	}
	lastNominatimRequestTime = Date.now();
	return timeoutFetch(url);
}

async function timeoutFetch(url: string): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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

interface PhotonFeature {
	type: 'Feature';
	geometry: { type: 'Point'; coordinates: [number, number] };
	properties: {
		osm_id: number;
		osm_type: 'N' | 'W' | 'R';
		osm_key?: string;
		osm_value?: string;
		name?: string;
		country?: string;
		state?: string;
		city?: string;
		district?: string;
		locality?: string;
		street?: string;
		housenumber?: string;
		postcode?: string;
	};
}

interface PhotonSearchResponse {
	features: PhotonFeature[];
}

interface NominatimReverseResult {
	lat: string;
	lon: string;
	address?: {
		suburb?: string;
		neighbourhood?: string;
		city_district?: string;
		postcode?: string;
	};
}

/** Search for places in a region using Photon (OSM fuzzy autocomplete). */
export async function searchLocations(
	query: string,
	region: string = 'berlin'
): Promise<LocationSearchResult[]> {
	if (query.trim().length < 2) return [];

	const bounds = regionBounds[region] ?? regionBounds.berlin;
	const center = regionCenter(bounds);
	const params = new URLSearchParams({
		q: query,
		limit: '5',
		lang: 'en',
		// Bias results toward the region center so Berlin matches outrank
		// distant duplicates (e.g. a Boxhagener Strasse anywhere else).
		lat: String(center.lat),
		lon: String(center.lng),
		// Hard bbox filter: minLon,minLat,maxLon,maxLat
		bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
	});

	let res: Response;
	try {
		res = await timeoutFetch(`${PHOTON_BASE}/api?${params}`);
	} catch (err) {
		console.error('[location] photon search failed:', err);
		return [];
	}
	if (!res.ok) {
		console.error('[location] photon search non-ok:', res.status);
		return [];
	}

	const data: PhotonSearchResponse = await res.json();
	return data.features.map(toSearchResult);
}

/** Derive general area (neighbourhood name + centroid) from an exact location.
 *  The region's display label is the fallback when reverse geocoding fails or
 *  returns no usable neighbourhood — an Amsterdam slot must never be labelled
 *  "Berlin". */
export async function deriveGeneralArea(
	location: LocationRef,
	region: string = DEFAULT_REGION
): Promise<{
	generalArea: string;
	centroidLat: number;
	centroidLng: number;
}> {
	const fallbackArea = regionLabel(region);
	const params = new URLSearchParams({
		lat: String(location.lat),
		lon: String(location.lng),
		format: 'json',
		addressdetails: '1',
		zoom: '16' // neighbourhood level
	});

	let res: Response;
	try {
		res = await nominatimFetch(`${NOMINATIM_BASE}/reverse?${params}`);
	} catch (err) {
		// Timeout or network failure -- do not block publish on an external geocoder.
		console.error('[location] nominatim reverse failed, falling through to generic area:', err);
		return {
			generalArea: fallbackArea,
			centroidLat: location.lat,
			centroidLng: location.lng
		};
	}
	if (!res.ok) {
		return {
			generalArea: fallbackArea,
			centroidLat: location.lat,
			centroidLng: location.lng
		};
	}

	const data: NominatimReverseResult = await res.json();
	const addr = data.address;
	const area =
		addr?.suburb || addr?.neighbourhood || addr?.city_district || addr?.postcode || fallbackArea;

	// Use the reverse-geocoded result's coordinates as the centroid
	// (this is the neighbourhood center, not the exact input location).
	return {
		generalArea: area,
		centroidLat: parseFloat(data.lat),
		centroidLng: parseFloat(data.lon)
	};
}

/** Marker used by LocationSearch when the user typed a free-text address that
 *  the geocoder didn't surface as a structured result. These have no real
 *  coords (lat: 0, lng: 0) so they can't be validated against a bbox -- treat
 *  the user's intent as authoritative and accept them. */
const MANUAL_PLACE_ID = 'manual';

/** Check if a location falls within the expected region.
 *
 *  Free-text manual entries (place_id === 'manual') bypass the bbox check --
 *  the user typed the address explicitly, often because the geocoder returned
 *  no Berlin match (e.g. small cafés, recently-opened venues) or returned a
 *  geocoded result outside the bbox. Trust the user's intent over geocoding.
 *  Real geocoder results are still bbox-checked. */
export function validateRegion(location: LocationRef, region: string = 'berlin'): boolean {
	if (location.place_id === MANUAL_PLACE_ID) return true;

	const bounds = regionBounds[region];
	if (!bounds) return false;
	const inside =
		location.lat >= bounds.south &&
		location.lat <= bounds.north &&
		location.lng >= bounds.west &&
		location.lng <= bounds.east;

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

// Region registry — the single source for region data (R9). A region key is
// what scopes.region stores; bounds drive search + validation, center drives
// the map, label drives user-facing copy and reverse-geocode fallbacks.

export interface RegionDef {
	bounds: { north: number; south: number; east: number; west: number };
	/** Map center as [lat, lng] (Leaflet order). */
	center: [number, number];
	/** User-facing display name. */
	label: string;
}

export const DEFAULT_REGION = 'berlin';

export const REGIONS: Record<string, RegionDef> = {
	berlin: {
		bounds: { north: 52.68, south: 52.34, east: 13.76, west: 13.09 },
		center: [52.52, 13.405],
		label: 'Berlin'
	},
	amsterdam: {
		bounds: { north: 52.43, south: 52.28, east: 5.08, west: 4.72 },
		center: [52.37, 4.895],
		label: 'Amsterdam'
	}
};

/** Display label for a region key; unknown/null keys fall back to the default region. */
export function regionLabel(region?: string | null): string {
	return (REGIONS[region ?? DEFAULT_REGION] ?? REGIONS[DEFAULT_REGION]).label;
}

/** Map center for a region key; unknown/null keys fall back to the default region. */
export function regionMapCenter(region?: string | null): [number, number] {
	return (REGIONS[region ?? DEFAULT_REGION] ?? REGIONS[DEFAULT_REGION]).center;
}

const regionBounds: Record<string, { north: number; south: number; east: number; west: number }> =
	Object.fromEntries(Object.entries(REGIONS).map(([key, def]) => [key, def.bounds]));

function regionCenter(b: { north: number; south: number; east: number; west: number }) {
	return { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
}

function toSearchResult(f: PhotonFeature): LocationSearchResult {
	const p = f.properties;
	const [lng, lat] = f.geometry.coordinates;
	const neighbourhood = p.district || p.locality || null;
	return {
		// Photon doesn't have a place_id; OSM type+id is the canonical identifier.
		// Existing rows in the DB carry numeric Nominatim place_ids; the prefix
		// avoids collisions.
		place_id: `${p.osm_type}${p.osm_id}`,
		name: formatPlaceName(p),
		address: formatAddress(p),
		lat,
		lng,
		neighbourhood
	};
}

function formatPlaceName(p: PhotonFeature['properties']): string {
	// Prefer the OSM "name" tag when present (cafes, bars, parks, venues).
	if (p.name) return p.name;
	// Fall back to street + house number for plain addresses.
	if (p.street) {
		return p.housenumber ? `${p.street} ${p.housenumber}` : p.street;
	}
	// Last resort: locality or district.
	return p.locality || p.district || p.city || 'Unnamed location';
}

function formatAddress(p: PhotonFeature['properties']): string {
	const parts: string[] = [];
	if (p.street) {
		parts.push(p.housenumber ? `${p.street} ${p.housenumber}` : p.street);
	}
	if (p.locality && p.locality !== p.street) parts.push(p.locality);
	else if (p.district) parts.push(p.district);
	if (p.postcode) parts.push(p.postcode);
	if (p.city && p.city !== p.locality) parts.push(p.city);
	return parts.length > 0 ? parts.join(', ') : (p.name ?? 'Unknown address');
}
