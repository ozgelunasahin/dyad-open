import type { TimeSlot } from './types.js';

const INVITATION_CUTOFF_HOURS = 12;

export type SlotState = 'available' | 'closing' | 'expired';

/** Derive the effective state of a time slot from its stored fields. */
export function deriveSlotState(slot: TimeSlot, now: Date = new Date()): SlotState {
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

/**
 * Is this slot full given its capacity and current occupancy?
 *
 * Capacity-aware and intentionally separate from `isAvailable` (which stays
 * timing-only by design). `capacity` is the prompt's per-slot joiner cap:
 *   - null  → legacy unlimited, NEVER full
 *   - N ≥ 1 → full once `occupied` (active accepted meetings on the slot)
 *             reaches N
 *
 * A full slot must not be invitable. This is a pure derivation; the seat count
 * (`occupied`) comes from the viewer-safe occupancy RPC.
 */
export function isSlotFull(occupied: number, capacity: number | null | undefined): boolean {
	if (capacity === null || capacity === undefined) return false;
	return occupied >= capacity;
}

/**
 * Has a meeting's slot finished — i.e. is its end time in the past?
 *
 * Used by the unified gathering card to decide the "past meeting" chrome (a
 * record, not a live control). Pure on an injectable `now`. The exact-end
 * boundary counts as passed (`end <= now` → true) — a meeting that ends right
 * now is over.
 */
export function slotEndPassed(
	startTime: string,
	durationMinutes: number,
	now: Date = new Date()
): boolean {
	const endMs = new Date(startTime).getTime() + durationMinutes * 60_000;
	return endMs <= now.getTime();
}
