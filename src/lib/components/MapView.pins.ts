import type { PromptSummary, TimeSlot } from '$lib/domain/types';

// ── Configuration ────────────────────────────────────────────────────────
export const FUZZ_MIN_METERS = 150;
export const FUZZ_MAX_METERS = 400;
const DEG_TO_METERS = 111_320;
// ~0.609 for Berlin (cos(52.52°))
const LON_SCALE = Math.cos((52.52 * Math.PI) / 180);

/**
 * Pin payload: one per (prompt, distinct general_area). The `slots` array
 * holds every slot of this prompt that lives in this area, ordered by
 * `start_time ASC` (the order `prompt-query.ts` returns). `slots[0]` seeds
 * the fuzz position. The BottomSheet card uses the full array to render
 * every date this conversation is offered in this area, instead of silently
 * dropping all but the first.
 */
export interface MapPin {
	position: [number, number];
	prompt: PromptSummary;
	slots: TimeSlot[];
	area: string;
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
 * Predicate applied to each slot before per-area dedup. When undefined,
 * every coordinate-bearing slot is eligible. When provided, slots returning
 * `false` are skipped — e.g. the discover page passes a date/area filter so
 * a "Wednesday only" filter does not still render the Tuesday-Mitte pin
 * of a conversation that also has a Wednesday slot elsewhere.
 */
export type SlotFilter = (slot: TimeSlot) => boolean;

/**
 * Build map pins from a list of prompts, one pin per (prompt, distinct
 * `general_area`). Multiple slots of the same prompt in the same area are
 * accumulated into the pin's `slots` array so the BottomSheet card can
 * render every date offered in this area, not just the first. The pin's
 * fuzzed position seeds on the earliest slot (slots[0]).
 *
 * Slots without coordinates are skipped. Slots with empty/whitespace-only
 * `general_area` are skipped to avoid empty-string dedup collisions. When a
 * `slotFilter` is provided, slots that fail the predicate are skipped before
 * dedup so the pin set reflects slot-level filters, not conversation-level.
 */
export function buildPins(items: PromptSummary[], slotFilter?: SlotFilter): MapPin[] {
	const pins: MapPin[] = [];

	for (const prompt of items) {
		const pinByArea = new Map<string, MapPin>();
		for (const slot of prompt.available_slots) {
			if (!slot || slot.general_area_lat == null || slot.general_area_lng == null) continue;

			const area = slot.general_area.trim();
			if (!area) continue;

			if (slotFilter && !slotFilter(slot)) continue;

			const existing = pinByArea.get(area);
			if (existing) {
				existing.slots.push(slot);
				continue;
			}

			const position = fuzzCentroid(slot.id, slot.general_area_lat, slot.general_area_lng);
			const pin: MapPin = { position, prompt, slots: [slot], area };
			pinByArea.set(area, pin);
			pins.push(pin);
		}
	}

	return pins;
}
