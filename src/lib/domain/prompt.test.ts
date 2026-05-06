import { describe, it, expect } from 'vitest';
import { canPublish, canArchive, canUnpublish, canRepublish, isWithinRollingWindow } from './prompt.js';
import type { Prompt, TimeSlotInput } from './types.js';

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
	return {
		id: 'test',
		author_id: 'user-1',
		title: 'Test',
		body: null,
		cover_image_url: null,
		state: 'draft',
		region: 'berlin',
		published_at: null,
		archived_at: null,
		hidden_at: null,
		edited_at: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	};
}

function makeSlot(daysFromNow: number = 2): TimeSlotInput {
	const d = new Date();
	d.setDate(d.getDate() + daysFromNow);
	return {
		start_time: d.toISOString(),
		duration_minutes: 60,
		location: { place_id: '1', name: 'Test', address: 'Test', lat: 52.5, lng: 13.4 }
	};
}

describe('isWithinRollingWindow', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('true for tomorrow', () => {
		const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
		expect(isWithinRollingWindow(tomorrow, now)).toBe(true);
	});

	it('true for 6 days from now', () => {
		const sixDays = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
		expect(isWithinRollingWindow(sixDays, now)).toBe(true);
	});

	it('true at exactly 7 days', () => {
		const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
		expect(isWithinRollingWindow(sevenDays, now)).toBe(true);
	});

	it('false for past dates', () => {
		const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		expect(isWithinRollingWindow(yesterday, now)).toBe(false);
	});

	it('false for now (must be strictly future)', () => {
		expect(isWithinRollingWindow(now, now)).toBe(false);
	});

	it('false for 8 days from now', () => {
		const eightDays = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
		expect(isWithinRollingWindow(eightDays, now)).toBe(false);
	});
});

describe('canPublish', () => {
	it('true for draft with 1-3 valid slots', () => {
		expect(canPublish(makePrompt(), [makeSlot()])).toBe(true);
		expect(canPublish(makePrompt(), [makeSlot(), makeSlot(3)])).toBe(true);
		expect(canPublish(makePrompt(), [makeSlot(), makeSlot(3), makeSlot(5)])).toBe(true);
	});

	it('false for non-draft state', () => {
		expect(canPublish(makePrompt({ state: 'published' }), [makeSlot()])).toBe(false);
		expect(canPublish(makePrompt({ state: 'archived' }), [makeSlot()])).toBe(false);
	});

	it('false with 0 slots', () => {
		expect(canPublish(makePrompt(), [])).toBe(false);
	});

	it('false with 4+ slots', () => {
		expect(canPublish(makePrompt(), [makeSlot(), makeSlot(3), makeSlot(4), makeSlot(5)])).toBe(false);
	});

	it('false with slot outside rolling window', () => {
		expect(canPublish(makePrompt(), [makeSlot(10)])).toBe(false);
	});
});

describe('canArchive', () => {
	it('true for published', () => {
		expect(canArchive(makePrompt({ state: 'published' }))).toBe(true);
	});

	it('false for draft or archived', () => {
		expect(canArchive(makePrompt({ state: 'draft' }))).toBe(false);
		expect(canArchive(makePrompt({ state: 'archived' }))).toBe(false);
	});
});

describe('canUnpublish', () => {
	it('true for published', () => {
		expect(canUnpublish(makePrompt({ state: 'published' }))).toBe(true);
	});

	it('false for draft or archived', () => {
		expect(canUnpublish(makePrompt({ state: 'draft' }))).toBe(false);
		expect(canUnpublish(makePrompt({ state: 'archived' }))).toBe(false);
	});
});

describe('canRepublish', () => {
	it('true for archived with valid slots', () => {
		expect(canRepublish(makePrompt({ state: 'archived' }), [makeSlot()])).toBe(true);
	});

	it('false for non-archived state', () => {
		expect(canRepublish(makePrompt({ state: 'draft' }), [makeSlot()])).toBe(false);
		expect(canRepublish(makePrompt({ state: 'published' }), [makeSlot()])).toBe(false);
	});

	it('false with 0 or 4+ slots', () => {
		expect(canRepublish(makePrompt({ state: 'archived' }), [])).toBe(false);
		expect(canRepublish(makePrompt({ state: 'archived' }), [makeSlot(), makeSlot(3), makeSlot(4), makeSlot(5)])).toBe(false);
	});
});
