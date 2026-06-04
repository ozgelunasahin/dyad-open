// Response-spine model for the author's conversation view.
//
// The author's page is the set of RESPONSES to their conversation; each
// response is the context for a (potential or actual) meeting. The schedule
// annotates each response with a status — it never becomes the spine, so a
// member's words stay visible whatever their meeting status. Status derives by
// precedence: has a meeting (confirmed/met) → pending request → cancelled →
// responded (no time chosen). One shape serves one-on-one and small group.
//
// Pure module so the precedence, edge cases, and ordering are unit-testable
// (see response-rows.test.ts); the page wires it into a $derived.

/** A meeting that is upcoming or awaiting feedback — i.e. holds a seat. */
export const ACTIVE_MEETING_STATES = ['scheduled', 'awaiting_feedback'];
/** A meeting that actually happened (feedback complete). */
export const MET_STATE = 'completed';

export type ResponseRowStatus = 'pending' | 'confirmed' | 'met' | 'cancelled' | 'responded';

export type ResponseRow = {
	key: string;
	username: string;
	body: string | null;
	message: string | null; // the note attached to a meeting request, if any
	createdAt: string;
	status: ResponseRowStatus;
	slotRef: string | null; // pre-formatted "day · neighbourhood"
	meetingId: string | null;
	invitationId: string | null;
	slotId: string | null;
	cancellationReason: string | null;
};

// Structural input shapes — the page's loader objects satisfy these.
export interface SpineComment {
	author_id: string;
	author_username?: string | null;
	body: string;
	created_at: string;
}
export interface SpineMeeting {
	id: string;
	scheduled_time: string;
	state: string;
	general_area: string | null;
	partner_username: string | null;
	cancellation_reason?: string | null;
}
export interface SpineInvitation {
	id: string;
	inviter_id: string;
	inviter_username: string;
	slot_id: string;
	state: string;
	message: string | null;
	comment_body: string | null;
	slot_start_time: string;
	slot_general_area: string | null;
	created_at: string;
}

/**
 * One row per responder, tagged with meeting status by precedence. Meetings
 * carry partner_username, not an id, so they match by username (unique);
 * pending matches the invitation by inviter_id. `formatDay` renders an ISO
 * timestamp as the compact day label used in status references.
 */
export function buildResponseRows(
	comments: SpineComment[],
	meetings: SpineMeeting[],
	invitations: SpineInvitation[],
	formatDay: (iso: string) => string
): ResponseRow[] {
	// Compact slot reference for a status line — day + neighbourhood, never the
	// exact address (that lives once in "Times you offered").
	const slotRef = (iso: string | undefined | null, area: string | null | undefined): string | null => {
		if (!iso) return null;
		return area ? `${formatDay(iso)} · ${area}` : formatDay(iso);
	};

	const rows: ResponseRow[] = [];
	const shownPending = new Set<string>(); // invitation ids already on a row

	const newRow = (
		over: Partial<ResponseRow> & Pick<ResponseRow, 'key' | 'username' | 'createdAt'>
	): ResponseRow => ({
		body: null,
		message: null,
		status: 'responded',
		slotRef: null,
		meetingId: null,
		invitationId: null,
		slotId: null,
		cancellationReason: null,
		...over
	});

	for (const c of comments) {
		const meeting = meetings.find(
			(m) =>
				m.partner_username === c.author_username &&
				(ACTIVE_MEETING_STATES.includes(m.state) || m.state === MET_STATE)
		);
		const pending = invitations.find((inv) => inv.inviter_id === c.author_id && inv.state === 'pending');
		const cancelled = meetings.find(
			(m) =>
				m.partner_username === c.author_username &&
				(m.state === 'cancelled_early' || m.state === 'cancelled_late')
		);

		const row = newRow({
			key: c.author_id,
			username: c.author_username ?? 'anonymous',
			body: c.body,
			createdAt: c.created_at
		});
		if (meeting) {
			row.status = meeting.state === MET_STATE ? 'met' : 'confirmed';
			row.slotRef = slotRef(meeting.scheduled_time, meeting.general_area);
			row.meetingId = meeting.id;
		} else if (pending) {
			row.status = 'pending';
			row.slotRef = slotRef(pending.slot_start_time, pending.slot_general_area);
			row.message = pending.message;
			row.invitationId = pending.id;
			row.slotId = pending.slot_id;
			shownPending.add(pending.id);
		} else if (cancelled) {
			row.status = 'cancelled';
			row.slotRef = slotRef(cancelled.scheduled_time, cancelled.general_area);
			row.cancellationReason = cancelled.cancellation_reason ?? null;
		}
		rows.push(row);
	}

	// Any pending request not already on a row stays actionable on its own: a
	// comment-less inviter, OR a second request from someone whose row resolved
	// to confirmed/met (multi-invite is allowed). Words shown only when this is
	// their sole row — otherwise the request line + actions suffice.
	for (const inv of invitations) {
		if (inv.state !== 'pending' || shownPending.has(inv.id)) continue;
		const hasPrimaryRow = comments.some((c) => c.author_id === inv.inviter_id);
		rows.push(
			newRow({
				key: `inv:${inv.id}`,
				username: inv.inviter_username,
				body: hasPrimaryRow ? null : inv.comment_body,
				message: inv.message,
				createdAt: inv.created_at,
				status: 'pending',
				slotRef: slotRef(inv.slot_start_time, inv.slot_general_area),
				invitationId: inv.id,
				slotId: inv.slot_id
			})
		);
		shownPending.add(inv.id);
	}

	// Comment-less accepted inviter (has a meeting, no comment) — rare under the
	// response-first flow, but surface them so they aren't lost.
	for (const inv of invitations) {
		if (inv.state !== 'accepted') continue;
		if (comments.some((c) => c.author_id === inv.inviter_id)) continue;
		const meeting = meetings.find(
			(m) =>
				m.partner_username === inv.inviter_username &&
				(ACTIVE_MEETING_STATES.includes(m.state) || m.state === MET_STATE)
		);
		rows.push(
			newRow({
				key: `inv:${inv.id}`,
				username: inv.inviter_username,
				body: inv.comment_body,
				createdAt: inv.created_at,
				status: meeting?.state === MET_STATE ? 'met' : 'confirmed',
				slotRef: slotRef(meeting?.scheduled_time ?? inv.slot_start_time, meeting?.general_area ?? inv.slot_general_area),
				meetingId: meeting?.id ?? null,
				slotId: inv.slot_id
			})
		);
	}

	// Actionable-first (pending), stable chronological within each group:
	// pending oldest-first (longest-waiting on top); everyone else newest-first.
	const rank = (r: ResponseRow) => (r.status === 'pending' ? 0 : 1);
	return rows.sort((a, b) => {
		if (rank(a) !== rank(b)) return rank(a) - rank(b);
		const at = new Date(a.createdAt).getTime();
		const bt = new Date(b.createdAt).getTime();
		return rank(a) === 0 ? at - bt : bt - at;
	});
}
