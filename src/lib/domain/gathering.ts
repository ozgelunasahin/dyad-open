// Pure derivations for the unified gathering card and its participants stack.
//
// The card shows a room: some seats are identified (named pins the viewer's RLS
// could load), the rest are anonymised (a bare count, never who). These helpers
// turn occupancy counts and identity lists into the numbers the UI renders, so
// the precedence and edge cases are unit-testable (see gathering.test.ts) and
// shared instead of re-derived inline at each call site.

/**
 * Anonymised seats to show beyond the identified pins.
 *
 * `occupied` is the slot's active-joiner count from the viewer-safe occupancy
 * RPC (includes the viewer's own seat when they hold one; the host holds no
 * joiner seat). `identifiedSeats` is how many of those seats are already shown
 * as named pins (e.g. the host + the viewer's "you" pin = the seats the viewer
 * can name). The remainder are the others — count only, never identity.
 */
export function othersBeyond(occupied: number, identifiedSeats: number): number {
	return Math.max(0, occupied - identifiedSeats);
}

/**
 * How the avatar stack splits its fixed visible width between identified pins,
 * anonymous circles, and the "+N" overflow. Identified pins fill first; the
 * anonymous circles take whatever room remains; everything else folds into the
 * overflow count.
 */
export function deriveStackLayout(
	identifiedCount: number,
	anonymousCount: number,
	maxVisible: number
): { visibleCount: number; anonShown: number; overflow: number } {
	const visibleCount = Math.min(identifiedCount, maxVisible);
	const anonShown = Math.min(anonymousCount, Math.max(0, maxVisible - visibleCount));
	const overflow = identifiedCount + anonymousCount - visibleCount - anonShown;
	return { visibleCount, anonShown, overflow };
}

/**
 * Build the otherId → meetingId map from a meeting's slot siblings.
 *
 * A group conversation is N two-person meetings sharing one slot; the people
 * present are the other participants across those rows. RLS guarantees the
 * viewer is on every returned row, so each row contributes exactly one other
 * participant. First-wins on duplicates; rows pairing the viewer with themself
 * are skipped (defensive — shouldn't occur, but keeps the map clean).
 */
export function buildParticipantsFromSiblings(
	siblings: Array<{ id: string; participant_a: string; participant_b: string }>,
	userId: string
): Map<string, string> {
	const meetingIdByOther = new Map<string, string>();
	for (const s of siblings) {
		const other = s.participant_a !== userId ? s.participant_a : s.participant_b;
		if (other !== userId && !meetingIdByOther.has(other)) meetingIdByOther.set(other, s.id);
	}
	return meetingIdByOther;
}
