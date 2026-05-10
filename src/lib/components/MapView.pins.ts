import type { PromptSummary, TimeSlot } from '$lib/domain/types';

// ── Configuration ────────────────────────────────────────────────────────
//
// FUZZ_MAX_METERS is load-bearing in two places — review both before
// adjusting:
//   1. fuzzCentroid (this file): the radius of the random offset applied
//      to every public-side coordinate. The privacy primitive.
//   2. MapView.svelte click handler: the radius for the "nearby" filter
//      that decides which pins join the BottomSheet on click.
export const FUZZ_MIN_METERS = 150;
export const FUZZ_MAX_METERS = 400;
const DEG_TO_METERS = 111_320;
// ~0.609 for Berlin (cos(52.52°))
const LON_SCALE = Math.cos((52.52 * Math.PI) / 180);

/**
 * Threshold below which two slot centroids cluster into one pin. Tuned
 * for Berlin neighborhood scale: roughly a 5-7 minute walking distance.
 * Below this, two locations read as the same place under typical zoom;
 * above, they read as distinct trips a user would consider separately.
 *
 * Independent of fuzz radius. Privacy (how much the public-side
 * coordinate is obscured) and clustering (how far apart two places need
 * to be before a viewer treats them as different) answer different
 * product questions.
 */
export const PIN_DEDUP_PROXIMITY_METERS = 800;

/**
 * Pin payload: one per (prompt, cluster of nearby slot centroids). The
 * `slots` array holds every slot of this prompt whose centroid sits within
 * `PIN_DEDUP_PROXIMITY_METERS` of `slots[0]`'s centroid, ordered by
 * `start_time ASC` (the order `prompt-query.ts` returns). `slots[0]` seeds
 * the fuzz position. Read the area label from `slots[0].general_area`
 * directly: clustered slots can carry slightly different area strings
 * under text drift like "Mitte" vs "Berlin Mitte".
 */
export interface MapPin {
	position: [number, number];
	prompt: PromptSummary;
	slots: TimeSlot[];
}

/** Approximate distance in meters between two lat/lng points in Berlin. Zero trig per call. */
export function berlinDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const dy = (lat2 - lat1) * DEG_TO_METERS;
	const dx = (lon2 - lon1) * DEG_TO_METERS * LON_SCALE;
	return Math.sqrt(dx * dx + dy * dy);
}

/** Simple string hash → float in [0, 1), seeded for stable per-slot fuzz. */
function hashToFloat(str: string, seed: number): number {
	let hash = seed;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
	}
	return (Math.abs(hash) % 10000) / 10000;
}

/**
 * Deterministic fuzz: shifts the centroid by a stable random-looking offset
 * derived from the slot ID, between FUZZ_MIN_METERS and FUZZ_MAX_METERS.
 * Same slot ID → same offset; different slots → independent offsets.
 */
export function fuzzCentroid(id: string, lat: number, lng: number): [number, number] {
	const angle = hashToFloat(id, 1) * 2 * Math.PI;
	const distFraction = hashToFloat(id, 2);
	const distMeters = FUZZ_MIN_METERS + distFraction * (FUZZ_MAX_METERS - FUZZ_MIN_METERS);

	const dLat = (distMeters / DEG_TO_METERS) * Math.cos(angle);
	const dLng = (distMeters / (DEG_TO_METERS * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

	return [lat + dLat, lng + dLng];
}

/**
 * Predicate applied to each slot before spatial dedup. When undefined,
 * every coordinate-bearing slot is eligible. When provided, slots returning
 * `false` are skipped — e.g. the discover page passes a date/area filter so
 * a "Wednesday only" filter does not still render the Tuesday-Mitte pin
 * of a conversation that also has a Wednesday slot elsewhere.
 */
export type SlotFilter = (slot: TimeSlot) => boolean;

/**
 * Build map pins from a list of prompts. Slots with the same `general_area`
 * label but spatially distant centroids (e.g. two slots both labeled
 * "Kreuzberg" but one at Kotti and one at Görli) get separate pins —
 * because the data has the granularity even when the text label doesn't.
 *
 * Dedup is spatial: a slot joins an existing pin's `slots` array when its
 * `general_area_lat/lng` is within `PIN_DEDUP_PROXIMITY_METERS` of that
 * pin's seed slot's centroid. Otherwise it seeds a new pin. The pin's
 * fuzzed position is computed from `slots[0]` (the earliest slot in this
 * cluster, since `available_slots` is `start_time ASC`).
 *
 * Slots without coordinates are skipped. Slots with empty/whitespace-only
 * `general_area` are skipped (the area label would be blank in the card).
 * When a `slotFilter` is provided, slots that fail the predicate are
 * skipped before dedup so the pin set reflects slot-level filters, not
 * conversation-level.
 */
export function buildPins(items: PromptSummary[], slotFilter?: SlotFilter): MapPin[] {
	const pins: MapPin[] = [];

	for (const prompt of items) {
		const promptPins: MapPin[] = [];
		for (const slot of prompt.available_slots) {
			if (!slot || slot.general_area_lat == null || slot.general_area_lng == null) continue;

			// Coordinates are non-null from the guard above — extract once and use locals
			// for the rest of the loop. Seeds in `promptPins` passed the same guard, so
			// `seed.general_area_lat!` / `seed.general_area_lng!` are the right shape to
			// express the construction invariant for the `find` predicate.
			const lat = slot.general_area_lat;
			const lng = slot.general_area_lng;

			// Skip slots with a blank area label so the BottomSheet card always
			// has something to display.
			if (!slot.general_area.trim()) continue;

			if (slotFilter && !slotFilter(slot)) continue;

			const existing = promptPins.find((p) => {
				const seed = p.slots[0];
				return (
					berlinDistance(lat, lng, seed.general_area_lat!, seed.general_area_lng!) <=
					PIN_DEDUP_PROXIMITY_METERS
				);
			});

			if (existing) {
				existing.slots.push(slot);
				continue;
			}

			const position = fuzzCentroid(slot.id, lat, lng);
			const pin: MapPin = { position, prompt, slots: [slot] };
			promptPins.push(pin);
			pins.push(pin);
		}
	}

	return pins;
}
