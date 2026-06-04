import { describe, it, expect } from 'vitest';
import type { PromptSummary, TimeSlot } from '$lib/domain/types';
import {
	buildPins,
	fuzzCentroid,
	FUZZ_MIN_METERS,
	FUZZ_MAX_METERS,
	PIN_DEDUP_PROXIMITY_METERS
} from './MapView.pins.js';

// ── Fixture builders ─────────────────────────────────────────────────────

let slotCounter = 0;

function makeSlot(opts: Partial<TimeSlot> & { area?: string; lat?: number | null; lng?: number | null; startTime?: string } = {}): TimeSlot {
	slotCounter += 1;
	return {
		id: opts.id ?? `slot-${slotCounter}`,
		prompt_id: opts.prompt_id ?? 'p-1',
		start_time: opts.startTime ?? opts.start_time ?? '2026-05-10T18:00:00Z',
		duration_minutes: opts.duration_minutes ?? 60,
		general_area: opts.area ?? opts.general_area ?? 'Mitte',
		general_area_lat: opts.lat !== undefined ? opts.lat : opts.general_area_lat ?? 52.52,
		general_area_lng: opts.lng !== undefined ? opts.lng : opts.general_area_lng ?? 13.405,
		accepted: opts.accepted ?? true,
		created_at: opts.created_at ?? '2026-05-09T10:00:00Z'
	};
}

function makePrompt(id: string, slots: TimeSlot[]): PromptSummary {
	return {
		id,
		author_id: `author-${id}`,
		author_username: 'alice',
		author_display_name: null,
		title: `Prompt ${id}`,
		body_snippet: '',
		cover_image_url: null,
		available_slots: slots,
		soonest_slot: slots[0]?.start_time ?? null,
		published_at: '2026-05-09T10:00:00Z',
		region: 'berlin',
		audience_scope: null,
		audience_scope_name: null,
		capacity: null
	};
}

describe('buildPins — per-slot, per-area', () => {
	it('emits one pin per distinct general_area when a prompt has slots in multiple areas', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', lat: 52.52, lng: 13.405 }),
			makeSlot({ area: 'Kreuzberg', lat: 52.499, lng: 13.403 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(2);
		expect(pins.map((p) => p.slots[0].general_area).sort()).toEqual(['Kreuzberg', 'Mitte']);
		expect(pins.every((p) => p.prompt.id === 'p1')).toBe(true);
	});

	it('emits one pin when all slots are in the same area, accumulating all slots into the pin', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ id: 's1', area: 'Mitte', startTime: '2026-05-10T09:00:00Z' }),
			makeSlot({ id: 's2', area: 'Mitte', startTime: '2026-05-11T15:00:00Z' }),
			makeSlot({ id: 's3', area: 'Mitte', startTime: '2026-05-12T20:00:00Z' })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots[0].general_area).toBe('Mitte');
		expect(pins[0].slots.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
	});

	it('skips slots without coordinates and uses the next valid slot', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ id: 's1', area: 'Mitte', lat: null }),
			makeSlot({ id: 's2', area: 'Mitte', lat: 52.52, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots[0].id).toBe('s2');
	});

	it('emits zero pins when a prompt has no slots', () => {
		const prompt = makePrompt('p1', []);
		expect(buildPins([prompt])).toHaveLength(0);
	});

	it('emits zero pins when all slots have null coordinates', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', lat: null }),
			makeSlot({ area: 'Kreuzberg', lng: null })
		]);
		expect(buildPins([prompt])).toHaveLength(0);
	});

	it('per-prompt dedup, not global: two different prompts each in Mitte produce two pins', () => {
		const prompts = [
			makePrompt('p1', [makeSlot({ area: 'Mitte' })]),
			makePrompt('p2', [makeSlot({ area: 'Mitte' })])
		];
		const pins = buildPins(prompts);
		expect(pins).toHaveLength(2);
		expect(pins.map((p) => p.prompt.id).sort()).toEqual(['p1', 'p2']);
	});

	it('same area, nearby centroids (within PIN_DEDUP_PROXIMITY_METERS): one pin holding both slots', () => {
		// (52.520, 13.405) → (52.521, 13.408) is roughly 230m apart in Berlin —
		// well within the 800m dedup-proximity threshold.
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'a', area: 'Mitte', lat: 52.520, lng: 13.405 }),
			makeSlot({ id: 'b', area: 'Mitte', lat: 52.521, lng: 13.408 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots).toHaveLength(2);
	});

	it('same area text, distant centroids (> PIN_DEDUP_PROXIMITY_METERS): two pins', () => {
		// Two slots both labeled "Kreuzberg" but at very different addresses:
		// Kottbusser Tor area (52.499, 13.418) and Görlitzer Park area (52.494, 13.443).
		// ~1.7km apart, far beyond the 800m proximity threshold. Each should get
		// its own pin so the user can see the conversation is genuinely in two
		// different parts of Kreuzberg, not just one.
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'kotti', area: 'Kreuzberg', lat: 52.499, lng: 13.418 }),
			makeSlot({ id: 'goerli', area: 'Kreuzberg', lat: 52.494, lng: 13.443 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(2);
		expect(pins[0].slots).toHaveLength(1);
		expect(pins[1].slots).toHaveLength(1);
		expect(pins.map((p) => p.slots[0].id).sort()).toEqual(['goerli', 'kotti']);
	});

	it('different area text, near-identical centroids: one pin (text drift across the same place)', () => {
		// A slot tagged "Mitte" and one tagged "Berlin Mitte" by Nominatim with
		// near-identical centroids should not produce two pins just because the
		// label string differs — spatial proximity wins under the new dedup.
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'a', area: 'Mitte', lat: 52.520, lng: 13.405 }),
			makeSlot({ id: 'b', area: 'Berlin Mitte', lat: 52.520, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots).toHaveLength(2);
	});

	it('skips slots whose general_area is empty or whitespace-only', () => {
		// Empty labels would render as blank in the BottomSheet card.
		const prompt = makePrompt('p1', [
			makeSlot({ area: '', lat: 52.52, lng: 13.405 }),
			makeSlot({ area: '   ', lat: 52.50, lng: 13.40 }),
			makeSlot({ area: 'Mitte', lat: 52.52, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots[0].general_area).toBe('Mitte');
	});

	it('locks the ordering invariant: with three same-area slots, slots[0] is the earliest by available_slots position', () => {
		// available_slots is ordered start_time ASC by prompt-query.ts. The first
		// slot in the array seeds the fuzzed position; the rest are appended in order.
		const earliest = makeSlot({ id: 'earliest', area: 'Mitte', startTime: '2026-05-10T09:00:00Z' });
		const middle = makeSlot({ id: 'middle', area: 'Mitte', startTime: '2026-05-10T15:00:00Z' });
		const latest = makeSlot({ id: 'latest', area: 'Mitte', startTime: '2026-05-10T20:00:00Z' });

		const prompt = makePrompt('p1', [earliest, middle, latest]);
		const pins = buildPins([prompt]);

		expect(pins).toHaveLength(1);
		expect(pins[0].slots.map((s) => s.id)).toEqual(['earliest', 'middle', 'latest']);
	});

	it('integration: mixed prompts produce the expected total pin count and area labels', () => {
		const prompts = [
			// Multi-area: two pins (using realistic Berlin coords so spatial dedup keeps them apart)
			makePrompt('multi', [
				makeSlot({ area: 'Mitte', lat: 52.520, lng: 13.405 }),
				makeSlot({ area: 'Kreuzberg', lat: 52.499, lng: 13.418 })
			]),
			// Single-area: one pin
			makePrompt('single', [makeSlot({ area: 'Neukölln', lat: 52.481, lng: 13.435 })]),
			// No coords: zero pins
			makePrompt('nocoord', [makeSlot({ area: 'Wedding', lat: null })])
		];
		const pins = buildPins(prompts);
		expect(pins).toHaveLength(3);
		expect(pins.map((p) => p.slots[0].general_area).sort()).toEqual(['Kreuzberg', 'Mitte', 'Neukölln']);
	});
});

describe('buildPins — spatial-dedup edge cases', () => {
	// Convert a metres-along-latitude offset to a degree delta (Berlin is small
	// enough that pure-latitude offsets are exact under berlinDistance).
	const DEG_PER_METER_LAT = 1 / 111_320;

	it('boundary: exactly PIN_DEDUP_PROXIMITY_METERS apart still collapses (predicate uses <=)', () => {
		const lat0 = 52.520;
		const lat1 = lat0 + PIN_DEDUP_PROXIMITY_METERS * DEG_PER_METER_LAT; // exactly at threshold
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'a', area: 'Mitte', lat: lat0, lng: 13.405 }),
			makeSlot({ id: 'b', area: 'Mitte', lat: lat1, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots).toHaveLength(2);
	});

	it('boundary: just past PIN_DEDUP_PROXIMITY_METERS splits into two pins', () => {
		const lat0 = 52.520;
		const lat1 = lat0 + (PIN_DEDUP_PROXIMITY_METERS + 1) * DEG_PER_METER_LAT; // 1m beyond
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'a', area: 'Mitte', lat: lat0, lng: 13.405 }),
			makeSlot({ id: 'b', area: 'Mitte', lat: lat1, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(2);
	});

	it('non-transitive clustering: cluster membership is measured against the seed only, not the whole cluster', () => {
		// Three slots in a line, each ~700m from the next:
		//   A → B: 700m (within 800m threshold, B joins A's pin)
		//   A → C: 1400m (beyond threshold, C seeds new pin)
		//   B → C: 700m (would cluster if measured pairwise — but we measure from seed A)
		// Expected: 2 pins. {A, B} and {C}. The seed-anchored algorithm is
		// load-bearing for predictability; pin assignment must not depend on
		// pairwise transitivity.
		const lat0 = 52.520;
		const latB = lat0 + 700 * DEG_PER_METER_LAT;
		const latC = lat0 + 1400 * DEG_PER_METER_LAT;
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'a', area: 'Mitte', lat: lat0, lng: 13.405 }),
			makeSlot({ id: 'b', area: 'Mitte', lat: latB, lng: 13.405 }),
			makeSlot({ id: 'c', area: 'Mitte', lat: latC, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(2);
		expect(pins[0].slots.map((s) => s.id)).toEqual(['a', 'b']);
		expect(pins[1].slots.map((s) => s.id)).toEqual(['c']);
	});
});

describe('buildPins — slotFilter', () => {
	it('with no slotFilter, every coordinate-bearing slot is eligible (regression)', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', lat: 52.520, lng: 13.405 }),
			makeSlot({ area: 'Kreuzberg', lat: 52.499, lng: 13.418 })
		]);
		expect(buildPins([prompt])).toHaveLength(2);
		expect(buildPins([prompt], undefined)).toHaveLength(2);
	});

	it('skips slots that fail the predicate before spatial dedup', () => {
		// A "Wednesday only" filter on a conversation with Tuesday-Mitte +
		// Wednesday-Kreuzberg yields only the Kreuzberg pin. Coordinates are
		// realistic and distinct so the assertion observes the filter-then-dedup
		// order rather than collapsing on coincident default coordinates.
		const prompt = makePrompt('p1', [
			makeSlot({
				id: 'tue-mitte',
				area: 'Mitte',
				lat: 52.520,
				lng: 13.405,
				startTime: '2026-05-12T18:00:00Z'
			}),
			makeSlot({
				id: 'wed-kreuzberg',
				area: 'Kreuzberg',
				lat: 52.499,
				lng: 13.418,
				startTime: '2026-05-13T18:00:00Z'
			})
		]);
		const wednesdayOnly = (slot: TimeSlot) => slot.start_time.startsWith('2026-05-13');
		const pins = buildPins([prompt], wednesdayOnly);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots[0].general_area).toBe('Kreuzberg');
		expect(pins[0].slots[0].id).toBe('wed-kreuzberg');
	});

	it('returns zero pins when the filter excludes every slot', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', lat: 52.520, lng: 13.405, startTime: '2026-05-12T18:00:00Z' }),
			makeSlot({
				area: 'Kreuzberg',
				lat: 52.499,
				lng: 13.418,
				startTime: '2026-05-13T18:00:00Z'
			})
		]);
		const friday = (slot: TimeSlot) => slot.start_time.startsWith('2026-05-15');
		expect(buildPins([prompt], friday)).toHaveLength(0);
	});

	it('filter is applied before dedup: same-area slots with one passing and one failing keep the passing slot', () => {
		// If the only Mitte slot that matches the filter is the second one,
		// dedup should not have already locked in the first slot's position.
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'wrong-day', area: 'Mitte', startTime: '2026-05-12T18:00:00Z' }),
			makeSlot({ id: 'right-day', area: 'Mitte', startTime: '2026-05-13T18:00:00Z' })
		]);
		const wednesdayOnly = (slot: TimeSlot) => slot.start_time.startsWith('2026-05-13');
		const pins = buildPins([prompt], wednesdayOnly);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots).toHaveLength(1);
		expect(pins[0].slots[0].id).toBe('right-day');
	});

	it('filter narrows the pin\'s slots[] without losing the pin entirely', () => {
		// Three Mitte slots; filter keeps two. The pin remains, but its slots[]
		// contains only the surviving two — the rejected one is silently dropped.
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'pass-a', area: 'Mitte', startTime: '2026-05-13T09:00:00Z' }),
			makeSlot({ id: 'reject', area: 'Mitte', startTime: '2026-05-12T15:00:00Z' }),
			makeSlot({ id: 'pass-b', area: 'Mitte', startTime: '2026-05-13T20:00:00Z' })
		]);
		const wednesdayOnly = (slot: TimeSlot) => slot.start_time.startsWith('2026-05-13');
		const pins = buildPins([prompt], wednesdayOnly);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots.map((s) => s.id)).toEqual(['pass-a', 'pass-b']);
	});

	it('predicate sees only coordinate-bearing slots (post-coord-guard)', () => {
		// Slots with null coords are skipped before the predicate runs, so a
		// filter that returns true for everything still respects the coord guard.
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', lat: null }),
			makeSlot({ area: 'Kreuzberg' })
		]);
		const allTrue = () => true;
		const pins = buildPins([prompt], allTrue);
		expect(pins).toHaveLength(1);
		expect(pins[0].slots[0].general_area).toBe('Kreuzberg');
	});
});

describe('fuzzCentroid', () => {
	it('produces a stable offset for the same slot ID', () => {
		const a = fuzzCentroid('slot-1', 52.52, 13.405);
		const b = fuzzCentroid('slot-1', 52.52, 13.405);
		expect(a).toEqual(b);
	});

	it('produces different offsets for different slot IDs at the same centroid', () => {
		const a = fuzzCentroid('slot-1', 52.52, 13.405);
		const b = fuzzCentroid('slot-2', 52.52, 13.405);
		expect(a).not.toEqual(b);
	});

	it('keeps the offset within [FUZZ_MIN_METERS, FUZZ_MAX_METERS] of the centroid', () => {
		const lat = 52.52;
		const lng = 13.405;
		// Sample several slot IDs to exercise the random-looking but bounded distance.
		for (const id of ['s1', 's2', 's3', 'slot-abcdef', 'longer-id-still-bounded']) {
			const [fLat, fLng] = fuzzCentroid(id, lat, lng);
			const dy = (fLat - lat) * 111_320;
			const dx = (fLng - lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
			const dist = Math.sqrt(dx * dx + dy * dy);
			expect(dist).toBeGreaterThanOrEqual(FUZZ_MIN_METERS - 0.01);
			expect(dist).toBeLessThanOrEqual(FUZZ_MAX_METERS + 0.01);
		}
	});
});
