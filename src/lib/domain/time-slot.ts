import type { TimeSlot } from './types.js';

const INVITATION_CUTOFF_HOURS = 12;

export type SlotState = 'available' | 'closing' | 'expired' | 'booked';

/** Derive the effective state of a time slot from its stored fields. */
export function deriveSlotState(slot: TimeSlot, now: Date = new Date()): SlotState {
	if (slot.accepted) return 'booked';

	const startTime = new Date(slot.start_time);
	if (startTime <= now) return 'expired';

	const cutoff = new Date(startTime.getTime() - INVITATION_CUTOFF_HOURS * 60 * 60 * 1000);
	if (cutoff <= now) return 'closing';

	return 'available';
}

/** Is this slot available for new invitations? */
export function isAvailable(slot: TimeSlot, now: Date = new Date()): boolean {
	return deriveSlotState(slot, now) === 'available';
}

/** Is this slot past its start time? */
export function isExpired(slot: TimeSlot, now: Date = new Date()): boolean {
	return deriveSlotState(slot, now) === 'expired';
}

/** Is this slot within the 12h cutoff window (no new invitations)? */
export function isClosing(slot: TimeSlot, now: Date = new Date()): boolean {
	return deriveSlotState(slot, now) === 'closing';
}

/** Should this slot be visible on the discover feed? */
export function isDiscoverable(slot: TimeSlot, now: Date = new Date()): boolean {
	return isAvailable(slot, now);
}
