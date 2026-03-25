import type { Meeting, CancellationTier } from './types.js';

/** Can this user cancel this meeting? */
export function canCancel(meeting: Meeting, userId: string): boolean {
	return (
		meeting.state === 'scheduled' &&
		(meeting.participant_a === userId || meeting.participant_b === userId)
	);
}

/** Derive the cancellation tier based on time until meeting. */
export function deriveCancellationTier(
	meeting: Meeting,
	now: Date = new Date()
): CancellationTier {
	const meetingTime = new Date(meeting.scheduled_time);
	const cutoff = new Date(meetingTime.getTime() - 12 * 60 * 60 * 1000);
	return now < cutoff ? 'early' : 'late';
}

/** Is this meeting past its scheduled time (should transition to awaiting_feedback)? */
export function isAwaitingFeedback(meeting: Meeting, now: Date = new Date()): boolean {
	return meeting.state === 'scheduled' && new Date(meeting.scheduled_time) <= now;
}
