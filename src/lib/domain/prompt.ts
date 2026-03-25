import type { Prompt, TimeSlotInput } from './types.js';

const ROLLING_WINDOW_DAYS = 7;
const MIN_SLOTS = 1;
const MAX_SLOTS = 3;

export function canPublish(prompt: Prompt, slots: TimeSlotInput[]): boolean {
	return (
		prompt.state === 'draft' &&
		slots.length >= MIN_SLOTS &&
		slots.length <= MAX_SLOTS &&
		slots.every((s) => isWithinRollingWindow(new Date(s.start_time)))
	);
}

export function canUnpublish(prompt: Prompt): boolean {
	return prompt.state === 'published';
}

export function canRepublish(prompt: Prompt, slots: TimeSlotInput[]): boolean {
	return (
		prompt.state === 'archived' &&
		slots.length >= MIN_SLOTS &&
		slots.length <= MAX_SLOTS &&
		slots.every((s) => isWithinRollingWindow(new Date(s.start_time)))
	);
}

export function isWithinRollingWindow(startTime: Date, now: Date = new Date()): boolean {
	const windowEnd = new Date(now.getTime() + ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
	return startTime > now && startTime <= windowEnd;
}
