import { describe, it, expect } from 'vitest';
import { canCancel, deriveCancellationTier, isAwaitingFeedback } from './meeting.js';
import type { Meeting } from './types.js';

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
	return {
		id: 'm1',
		invitation_id: 'inv1',
		prompt_id: 'p1',
		participant_a: 'user-a',
		participant_b: 'user-b',
		scheduled_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
		duration_minutes: 60,
		state: 'scheduled',
		created_at: new Date().toISOString(),
		resolved_at: null,
		...overrides
	};
}

describe('canCancel', () => {
	it('true for scheduled meeting, participant_a', () => {
		expect(canCancel(makeMeeting(), 'user-a')).toBe(true);
	});

	it('true for scheduled meeting, participant_b', () => {
		expect(canCancel(makeMeeting(), 'user-b')).toBe(true);
	});

	it('false for non-participant', () => {
		expect(canCancel(makeMeeting(), 'user-c')).toBe(false);
	});

	it('false for cancelled meeting', () => {
		expect(canCancel(makeMeeting({ state: 'cancelled_early' }), 'user-a')).toBe(false);
	});

	it('false for awaiting_feedback', () => {
		expect(canCancel(makeMeeting({ state: 'awaiting_feedback' }), 'user-a')).toBe(false);
	});
});

describe('deriveCancellationTier', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('early for meeting >12h away', () => {
		const meeting = makeMeeting({
			scheduled_time: new Date('2026-03-26T12:00:00Z').toISOString() // 24h away
		});
		expect(deriveCancellationTier(meeting, now)).toBe('early');
	});

	it('late for meeting <12h away', () => {
		const meeting = makeMeeting({
			scheduled_time: new Date('2026-03-25T20:00:00Z').toISOString() // 8h away
		});
		expect(deriveCancellationTier(meeting, now)).toBe('late');
	});

	it('late at exactly 12h boundary', () => {
		const meeting = makeMeeting({
			scheduled_time: new Date('2026-03-26T00:00:00Z').toISOString() // exactly 12h
		});
		expect(deriveCancellationTier(meeting, now)).toBe('late');
	});

	it('early at 12h + 1min', () => {
		const meeting = makeMeeting({
			scheduled_time: new Date('2026-03-26T00:01:00Z').toISOString()
		});
		expect(deriveCancellationTier(meeting, now)).toBe('early');
	});
});

describe('isAwaitingFeedback', () => {
	const now = new Date('2026-03-25T12:00:00Z');

	it('true for scheduled meeting past its time', () => {
		const meeting = makeMeeting({
			scheduled_time: new Date('2026-03-25T10:00:00Z').toISOString()
		});
		expect(isAwaitingFeedback(meeting, now)).toBe(true);
	});

	it('false for future scheduled meeting', () => {
		expect(isAwaitingFeedback(makeMeeting(), now)).toBe(false);
	});

	it('false for already transitioned meeting', () => {
		const meeting = makeMeeting({ state: 'awaiting_feedback' });
		expect(isAwaitingFeedback(meeting, now)).toBe(false);
	});
});
