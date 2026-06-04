import { describe, it, expect } from 'vitest';
import { buildResponseRows, type SpineComment, type SpineInvitation, type SpineMeeting } from './response-rows.js';

// Deterministic day formatter so refs are assertable.
const fmt = (iso: string) => `day(${iso.slice(0, 10)})`;

const comment = (over: Partial<SpineComment> & Pick<SpineComment, 'author_id'>): SpineComment => ({
	author_username: over.author_id,
	body: `${over.author_id} says hi`,
	created_at: '2026-06-01T10:00:00Z',
	...over
});

const meeting = (over: Partial<SpineMeeting> & Pick<SpineMeeting, 'id' | 'partner_username'>): SpineMeeting => ({
	scheduled_time: '2026-06-06T09:00:00Z',
	state: 'scheduled',
	general_area: 'Kreuzberg',
	cancellation_reason: null,
	...over
});

const invitation = (
	over: Partial<SpineInvitation> & Pick<SpineInvitation, 'id' | 'inviter_id'>
): SpineInvitation => ({
	inviter_username: over.inviter_id,
	slot_id: 'slot-1',
	state: 'pending',
	message: null,
	comment_body: null,
	slot_start_time: '2026-06-06T09:00:00Z',
	slot_general_area: 'Kreuzberg',
	created_at: '2026-06-02T10:00:00Z',
	...over
});

describe('buildResponseRows', () => {
	it('tags an active meeting as confirmed, with meeting link and day · area ref', () => {
		const rows = buildResponseRows(
			[comment({ author_id: 'tom' })],
			[meeting({ id: 'm1', partner_username: 'tom' })],
			[],
			fmt
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			status: 'confirmed',
			meetingId: 'm1',
			slotRef: 'day(2026-06-06) · Kreuzberg',
			body: 'tom says hi'
		});
	});

	it('tags a completed meeting as met — never "responded"', () => {
		const rows = buildResponseRows(
			[comment({ author_id: 'kai' })],
			[meeting({ id: 'm2', partner_username: 'kai', state: 'completed' })],
			[],
			fmt
		);
		expect(rows[0].status).toBe('met');
		expect(rows[0].meetingId).toBe('m2');
	});

	it('tags a pending invitation as pending, carrying the request note and action ids', () => {
		const rows = buildResponseRows(
			[comment({ author_id: 'ben' })],
			[],
			[invitation({ id: 'i1', inviter_id: 'ben', message: 'evenings work best' })],
			fmt
		);
		expect(rows[0]).toMatchObject({
			status: 'pending',
			invitationId: 'i1',
			slotId: 'slot-1',
			message: 'evenings work best'
		});
	});

	it('tags a cancelled meeting (no newer request) as cancelled, with the reason', () => {
		const rows = buildResponseRows(
			[comment({ author_id: 'mia' })],
			[meeting({ id: 'm3', partner_username: 'mia', state: 'cancelled_late', cancellation_reason: 'ill' })],
			[],
			fmt
		);
		expect(rows[0].status).toBe('cancelled');
		expect(rows[0].cancellationReason).toBe('ill');
	});

	it('a responder with no invitation is plain responded — words only', () => {
		const rows = buildResponseRows([comment({ author_id: 'nina' })], [], [], fmt);
		expect(rows[0]).toMatchObject({ status: 'responded', slotRef: null, meetingId: null, invitationId: null });
	});

	it('precedence: cancelled meeting + newer pending request resolves to pending (re-invited)', () => {
		const rows = buildResponseRows(
			[comment({ author_id: 'mia' })],
			[meeting({ id: 'm3', partner_username: 'mia', state: 'cancelled_early' })],
			[invitation({ id: 'i2', inviter_id: 'mia' })],
			fmt
		);
		expect(rows[0].status).toBe('pending');
		expect(rows[0].invitationId).toBe('i2');
	});

	it('a comment-less pending inviter gets a synthetic actionable row with the joined body', () => {
		const rows = buildResponseRows(
			[],
			[],
			[invitation({ id: 'i3', inviter_id: 'zoe', comment_body: 'joined via invite' })],
			fmt
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ key: 'inv:i3', status: 'pending', body: 'joined via invite' });
	});

	it('a second pending request from an already-confirmed responder stays actionable (extra row, no repeated words)', () => {
		const rows = buildResponseRows(
			[comment({ author_id: 'tom' })],
			[meeting({ id: 'm1', partner_username: 'tom' })],
			[invitation({ id: 'i4', inviter_id: 'tom', slot_id: 'slot-2' })],
			fmt
		);
		expect(rows).toHaveLength(2);
		const pendingRow = rows.find((r) => r.status === 'pending');
		expect(pendingRow).toMatchObject({ key: 'inv:i4', invitationId: 'i4', slotId: 'slot-2', body: null });
		expect(rows.some((r) => r.status === 'confirmed' && r.meetingId === 'm1')).toBe(true);
	});

	it('a comment-less accepted inviter surfaces as confirmed, linked to their meeting when matchable', () => {
		const rows = buildResponseRows(
			[],
			[meeting({ id: 'm5', partner_username: 'rex' })],
			[invitation({ id: 'i5', inviter_id: 'rex', state: 'accepted', comment_body: 'count me in' })],
			fmt
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ status: 'confirmed', meetingId: 'm5', body: 'count me in' });
	});

	it('a comment-less accepted inviter whose meeting was cancelled reads cancelled — never confirmed', () => {
		const rows = buildResponseRows(
			[],
			[
				meeting({
					id: 'm6',
					partner_username: 'rex',
					state: 'cancelled_early',
					cancellation_reason: 'venue fell through'
				})
			],
			[invitation({ id: 'i6', inviter_id: 'rex', state: 'accepted', comment_body: 'count me in' })],
			fmt
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			status: 'cancelled',
			meetingId: null,
			cancellationReason: 'venue fell through',
			body: 'count me in'
		});
	});

	it('a comment-less accepted inviter with no matching meeting at all gets no row (nothing truthful to claim)', () => {
		const rows = buildResponseRows(
			[],
			[],
			[invitation({ id: 'i7', inviter_id: 'rex', state: 'accepted', comment_body: 'count me in' })],
			fmt
		);
		expect(rows).toHaveLength(0);
	});

	it('orders pending first (oldest request on top), then everyone else newest-first', () => {
		const rows = buildResponseRows(
			[
				comment({ author_id: 'old-pending', created_at: '2026-06-01T08:00:00Z' }),
				comment({ author_id: 'new-pending', created_at: '2026-06-03T08:00:00Z' }),
				comment({ author_id: 'older-responded', created_at: '2026-06-01T09:00:00Z' }),
				comment({ author_id: 'newer-responded', created_at: '2026-06-02T09:00:00Z' })
			],
			[],
			[
				invitation({ id: 'iA', inviter_id: 'old-pending' }),
				invitation({ id: 'iB', inviter_id: 'new-pending' })
			],
			fmt
		);
		expect(rows.map((r) => r.username)).toEqual([
			'old-pending',
			'new-pending',
			'newer-responded',
			'older-responded'
		]);
	});
});
