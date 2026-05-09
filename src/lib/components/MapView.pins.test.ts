import { describe, it, expect } from 'vitest';
import type { PromptSummary, TimeSlot } from '$lib/domain/types';
import { buildPins, fuzzCentroid, FUZZ_MIN_METERS, FUZZ_MAX_METERS } from './MapView.pins.js';

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
		title: `Prompt ${id}`,
		body_snippet: '',
		cover_image_url: null,
		author_username: 'alice',
		author_display_name: null,
		audience_scope: null,
		audience_scope_name: null,
		state: 'published',
		published_at: '2026-05-09T10:00:00Z',
		soonest_slot: slots[0]?.start_time ?? null,
		available_slots: slots
	} as unknown as PromptSummary;
}

describe('buildPins — per-slot, per-area', () => {
	it('emits one pin per distinct general_area when a prompt has slots in multiple areas', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', lat: 52.52, lng: 13.405 }),
			makeSlot({ area: 'Kreuzberg', lat: 52.499, lng: 13.403 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(2);
		expect(pins.map((p) => p.area).sort()).toEqual(['Kreuzberg', 'Mitte']);
		expect(pins.every((p) => p.prompt.id === 'p1')).toBe(true);
	});

	it('emits one pin when all slots are in the same area', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte' }),
			makeSlot({ area: 'Mitte' }),
			makeSlot({ area: 'Mitte' })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].area).toBe('Mitte');
	});

	it('skips slots without coordinates and uses the next valid slot', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ id: 's1', area: 'Mitte', lat: null }),
			makeSlot({ id: 's2', area: 'Mitte', lat: 52.52, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].slot.id).toBe('s2');
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

	it('text-key wins: same area name with different lat/lng collapses to one pin', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', lat: 52.520, lng: 13.405 }),
			makeSlot({ area: 'Mitte', lat: 52.521, lng: 13.408 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
	});

	it('skips slots whose general_area is empty or whitespace-only', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: '', lat: 52.52, lng: 13.405 }),
			makeSlot({ area: '   ', lat: 52.50, lng: 13.40 }),
			makeSlot({ area: 'Mitte', lat: 52.52, lng: 13.405 })
		]);
		const pins = buildPins([prompt]);
		expect(pins).toHaveLength(1);
		expect(pins[0].area).toBe('Mitte');
	});

	it('locks the ordering invariant: with three same-area slots, the earliest by available_slots position wins', () => {
		// available_slots is ordered start_time ASC by prompt-query.ts. The first
		// slot in the array is the one whose fuzzed position represents the area.
		const earliest = makeSlot({ id: 'earliest', area: 'Mitte', startTime: '2026-05-10T09:00:00Z' });
		const middle = makeSlot({ id: 'middle', area: 'Mitte', startTime: '2026-05-10T15:00:00Z' });
		const latest = makeSlot({ id: 'latest', area: 'Mitte', startTime: '2026-05-10T20:00:00Z' });

		const prompt = makePrompt('p1', [earliest, middle, latest]);
		const pins = buildPins([prompt]);

		expect(pins).toHaveLength(1);
		expect(pins[0].slot.id).toBe('earliest');
	});

	it('integration: mixed prompts produce the expected total pin count and area labels', () => {
		const prompts = [
			// Multi-area: two pins
			makePrompt('multi', [
				makeSlot({ area: 'Mitte' }),
				makeSlot({ area: 'Kreuzberg' })
			]),
			// Single-area: one pin
			makePrompt('single', [makeSlot({ area: 'Neukölln' })]),
			// No coords: zero pins
			makePrompt('nocoord', [makeSlot({ area: 'Wedding', lat: null })])
		];
		const pins = buildPins(prompts);
		expect(pins).toHaveLength(3);
		expect(pins.map((p) => p.area).sort()).toEqual(['Kreuzberg', 'Mitte', 'Neukölln']);
	});
});

describe('buildPins — slotFilter', () => {
	it('with no slotFilter, every coordinate-bearing slot is eligible (regression)', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte' }),
			makeSlot({ area: 'Kreuzberg' })
		]);
		expect(buildPins([prompt])).toHaveLength(2);
		expect(buildPins([prompt], undefined)).toHaveLength(2);
	});

	it('skips slots that fail the predicate before per-area dedup', () => {
		// A "Wednesday only" filter on a conversation with Tuesday-Mitte +
		// Wednesday-Kreuzberg should yield only the Kreuzberg pin.
		const prompt = makePrompt('p1', [
			makeSlot({ id: 'tue-mitte', area: 'Mitte', startTime: '2026-05-12T18:00:00Z' }),
			makeSlot({ id: 'wed-kreuzberg', area: 'Kreuzberg', startTime: '2026-05-13T18:00:00Z' })
		]);
		const wednesdayOnly = (slot: TimeSlot) => slot.start_time.startsWith('2026-05-13');
		const pins = buildPins([prompt], wednesdayOnly);
		expect(pins).toHaveLength(1);
		expect(pins[0].area).toBe('Kreuzberg');
		expect(pins[0].slot.id).toBe('wed-kreuzberg');
	});

	it('returns zero pins when the filter excludes every slot', () => {
		const prompt = makePrompt('p1', [
			makeSlot({ area: 'Mitte', startTime: '2026-05-12T18:00:00Z' }),
			makeSlot({ area: 'Kreuzberg', startTime: '2026-05-13T18:00:00Z' })
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
		expect(pins[0].slot.id).toBe('right-day');
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
		expect(pins[0].area).toBe('Kreuzberg');
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
