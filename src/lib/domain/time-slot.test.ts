import { describe, it, expect } from 'vitest';
import { deriveSlotState, isAvailable, isExpired, isClosing, isDiscoverable } from './time-slot.js';
import type { TimeSlot } from './types.js';

function makeSlot(overrides: Partial<TimeSlot> = {}): TimeSlot {
	return {
		id: 'test-slot',
		prompt_id: 'test-prompt',
		start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
		duration_minutes: 60,
		general_area: 'Kreuzberg',
		general_area_lat: 52.49,
		general_area_lng: 13.42,
		accepted: false,
		created_at: new Date().toISOString(),
		...overrides
	};
}

function hoursFromNow(hours: number, now: Date = new Date()): string {
	return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

describe('deriveSlotState', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('returns "available" for a slot well in the future', () => {
		const slot = makeSlot({ start_time: hoursFromNow(48, now) });
		expect(deriveSlotState(slot, now)).toBe('available');
	});

	it('returns "available" at exactly 12h + 1min before start', () => {
		const slot = makeSlot({ start_time: hoursFromNow(12 + 1 / 60, now) });
		expect(deriveSlotState(slot, now)).toBe('available');
	});

	it('returns "closing" at exactly 12h before start', () => {
		const slot = makeSlot({ start_time: hoursFromNow(12, now) });
		expect(deriveSlotState(slot, now)).toBe('closing');
	});

	it('returns "closing" at 6h before start', () => {
		const slot = makeSlot({ start_time: hoursFromNow(6, now) });
		expect(deriveSlotState(slot, now)).toBe('closing');
	});

	it('returns "closing" at 1min before start', () => {
		const slot = makeSlot({ start_time: hoursFromNow(1 / 60, now) });
		expect(deriveSlotState(slot, now)).toBe('closing');
	});

	it('returns "expired" at exactly start time', () => {
		const slot = makeSlot({ start_time: now.toISOString() });
		expect(deriveSlotState(slot, now)).toBe('expired');
	});

	it('returns "expired" after start time', () => {
		const slot = makeSlot({ start_time: hoursFromNow(-1, now) });
		expect(deriveSlotState(slot, now)).toBe('expired');
	});

	it('returns "booked" when accepted, regardless of time', () => {
		const futureSlot = makeSlot({ accepted: true, start_time: hoursFromNow(48, now) });
		expect(deriveSlotState(futureSlot, now)).toBe('booked');

		const pastSlot = makeSlot({ accepted: true, start_time: hoursFromNow(-24, now) });
		expect(deriveSlotState(pastSlot, now)).toBe('booked');
	});
});

describe('isAvailable', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('true for future non-accepted slot outside cutoff', () => {
		expect(isAvailable(makeSlot({ start_time: hoursFromNow(24, now) }), now)).toBe(true);
	});

	it('false for closing slot', () => {
		expect(isAvailable(makeSlot({ start_time: hoursFromNow(6, now) }), now)).toBe(false);
	});

	it('false for expired slot', () => {
		expect(isAvailable(makeSlot({ start_time: hoursFromNow(-1, now) }), now)).toBe(false);
	});

	it('false for accepted slot', () => {
		expect(isAvailable(makeSlot({ accepted: true }), now)).toBe(false);
	});
});

describe('isExpired', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('true for past slot', () => {
		expect(isExpired(makeSlot({ start_time: hoursFromNow(-1, now) }), now)).toBe(true);
	});

	it('false for future slot', () => {
		expect(isExpired(makeSlot({ start_time: hoursFromNow(24, now) }), now)).toBe(false);
	});

	it('false for accepted slot (booked, not expired)', () => {
		expect(isExpired(makeSlot({ accepted: true, start_time: hoursFromNow(-1, now) }), now)).toBe(false);
	});
});

describe('isClosing', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('true within 12h cutoff', () => {
		expect(isClosing(makeSlot({ start_time: hoursFromNow(6, now) }), now)).toBe(true);
	});

	it('false outside 12h cutoff', () => {
		expect(isClosing(makeSlot({ start_time: hoursFromNow(24, now) }), now)).toBe(false);
	});

	it('false for past slot (expired, not closing)', () => {
		expect(isClosing(makeSlot({ start_time: hoursFromNow(-1, now) }), now)).toBe(false);
	});
});

describe('isDiscoverable', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('same as isAvailable', () => {
		const available = makeSlot({ start_time: hoursFromNow(24, now) });
		const closing = makeSlot({ start_time: hoursFromNow(6, now) });
		const expired = makeSlot({ start_time: hoursFromNow(-1, now) });

		expect(isDiscoverable(available, now)).toBe(true);
		expect(isDiscoverable(closing, now)).toBe(false);
		expect(isDiscoverable(expired, now)).toBe(false);
	});
});
