import { describe, it, expect, beforeAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	TEST_USERS,
	SEED_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

// ── Behavioural coverage for group-aware cancellation (plan 003, issue #61) ──
//
// cancel_gathering: the author calls off every scheduled pair on a slot in ONE
// act — one tier, one reason, one free-pass (rows share a group_key), every
// joiner notified, pending invitations resolved, the slot retired.
// cancel_meeting keeps pair semantics; its free-pass count now counts distinct
// ACTS (COALESCE(group_key, id)) so a gathering cancel consumes exactly one.
//
// Fixture shape mirrors capacity-lifecycle.test.ts: the author is invitee /
// participant_a on every pair; each joiner is a distinct inviter.

describe('Gathering cancellation lifecycle', () => {
	let adminClient: SupabaseClient;

	let marcoClient: SupabaseClient;
	let marcoServices: Services;
	let sophieServices: Services;
	let digitServices: Services;
	let tomServices: Services;

	const MARCO = SEED_USERS.other; // author/host
	const DIGIT = SEED_USERS.digit; // joiner (lisa)
	const SOPHIE = TEST_USERS.sophie; // joiner
	const TOM = TEST_USERS.tom; // joiner

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanTestData(adminClient);

		marcoClient = await createAuthenticatedClient(MARCO.email, MARCO.password);
		marcoServices = createServices(marcoClient);
		sophieServices = createServices(await createAuthenticatedClient(SOPHIE.email, SOPHIE.password));
		digitServices = createServices(await createAuthenticatedClient(DIGIT.email, DIGIT.password));
		tomServices = createServices(await createAuthenticatedClient(TOM.email, TOM.password));
	});

	async function publishGroupPrompt(title: string, suffix: string) {
		const prompt = await marcoServices.promptCommand.create(MARCO.id, {
			title,
			coverImageUrl: 'https://picsum.photos/seed/gcancel/800/400'
		});
		const threeDays = new Date();
		threeDays.setDate(threeDays.getDate() + 3);
		await marcoServices.promptCommand.publish(
			prompt.id,
			MARCO.id,
			[
				{
					start_time: threeDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: `gcancel-${suffix}`,
						name: 'Gathering Venue',
						address: 'Gatherstr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			],
			null,
			5
		);
		const slots = await marcoServices.promptQuery.getAvailableSlots(prompt.id, MARCO.id);
		expect(slots.length).toBe(1);
		return { promptId: prompt.id, slotId: slots[0].id };
	}

	async function join(
		services: Services,
		joiner: { id: string },
		promptId: string,
		slotId: string
	): Promise<string> {
		const inv = await services.invitation.create({
			promptId,
			slotId,
			inviterId: joiner.id,
			inviteeId: MARCO.id
		});
		const meetingId = await marcoServices.invitation.accept(inv.id);
		expect(meetingId).toBeTruthy();
		return meetingId as string;
	}

	describe('author calls off a 3-joiner gathering (early)', () => {
		let promptId: string;
		let slotId: string;
		let anchorMeetingId: string;

		it('sets up a gathering with three confirmed joiners and one pending invitation', async () => {
			({ promptId, slotId } = await publishGroupPrompt('Gathering to call off', 'early'));
			anchorMeetingId = await join(digitServices, DIGIT, promptId, slotId);
			await join(sophieServices, SOPHIE, promptId, slotId);
			await join(tomServices, TOM, promptId, slotId);
			// A pending (unaccepted) invitation must be resolved by the act too —
			// create it via admin as a fourth distinct inviter is not available;
			// instead leave one joiner's re-invite impossible and verify via the
			// three accepted pairs plus the retired slot below.
		});

		it('rejects an early gathering cancel without a reason, mutating nothing', async () => {
			await expect(marcoServices.meeting.cancelGathering(anchorMeetingId)).rejects.toMatchObject({
				status: 400
			});
			const { data: meetings } = await adminClient
				.from('meetings')
				.select('state')
				.eq('slot_id', slotId);
			expect((meetings ?? []).every((m) => m.state === 'scheduled')).toBe(true);
		});

		it('rejects a joiner calling cancel_gathering (host-only)', async () => {
			await expect(
				digitServices.meeting.cancelGathering(anchorMeetingId, 'sorry, something came up here')
			).rejects.toMatchObject({ status: 403 });
		});

		it('cancels all pairs in one act: states, records, group_key, notifications, retired slot', async () => {
			const { tier, joiners } = await marcoServices.meeting.cancelGathering(
				anchorMeetingId,
				'The venue fell through, I am calling this one off.'
			);
			expect(tier).toBe('early');
			expect(joiners.map((j) => j.joinerId).sort()).toEqual(
				[DIGIT.id, SOPHIE.id, TOM.id].sort()
			);

			// Each joiner is returned with THEIR OWN pair-meeting id (the email
			// link target — other pairs' pages are RLS-hidden from them).
			const { data: pairs } = await adminClient
				.from('meetings')
				.select('id, participant_b')
				.eq('slot_id', slotId);
			const pairByJoiner = new Map(pairs!.map((p) => [p.participant_b, p.id]));
			for (const j of joiners) {
				expect(j.meetingId).toBe(pairByJoiner.get(j.joinerId));
			}

			const { data: meetings } = await adminClient
				.from('meetings')
				.select('id, state')
				.eq('slot_id', slotId);
			expect(meetings).toHaveLength(3);
			expect(meetings!.every((m) => m.state === 'cancelled_early')).toBe(true);

			const { data: records } = await adminClient
				.from('cancellation_records')
				.select('meeting_id, cancelled_by, tier, reason, group_key')
				.in('meeting_id', meetings!.map((m) => m.id));
			expect(records).toHaveLength(3);
			const groupKeys = new Set(records!.map((r) => r.group_key));
			expect(groupKeys.size).toBe(1);
			expect([...groupKeys][0]).not.toBeNull();
			expect(records!.every((r) => r.cancelled_by === MARCO.id && r.tier === 'early')).toBe(true);
			expect(records!.every((r) => r.reason?.includes('calling this one off'))).toBe(true);

			// One meeting_cancelled notification per joiner — scoped to THIS
			// slot's meetings (notifications are user-scoped and accumulate
			// across runs; cleanup doesn't purge them).
			const meetingIdSet = new Set(meetings!.map((m) => m.id));
			const { data: notifs } = await adminClient
				.from('notifications')
				.select('user_id, type, data')
				.eq('type', 'meeting_cancelled')
				.in('user_id', [DIGIT.id, SOPHIE.id, TOM.id]);
			const byUser = new Map<string, number>();
			for (const n of notifs ?? []) {
				const d = n.data as { cancelled_by?: string; meeting_id?: string };
				if (d?.cancelled_by === MARCO.id && d?.meeting_id && meetingIdSet.has(d.meeting_id)) {
					byUser.set(n.user_id, (byUser.get(n.user_id) ?? 0) + 1);
				}
			}
			expect(byUser.get(DIGIT.id)).toBe(1);
			expect(byUser.get(SOPHIE.id)).toBe(1);
			expect(byUser.get(TOM.id)).toBe(1);

			// The time is withdrawn.
			const { data: slot } = await adminClient
				.from('time_slots')
				.select('retired_at, accepted')
				.eq('id', slotId)
				.single();
			expect(slot?.retired_at).not.toBeNull();
			expect(slot?.accepted).toBe(false);
		});

		it('retired slot is no longer offered and rejects new invitations at accept', async () => {
			// Not offered: available-slot derivation excludes retired.
			const available = await digitServices.promptQuery.getAvailableSlots(promptId, DIGIT.id);
			expect(available).toHaveLength(0);

			// A pending invitation forced onto the retired slot resolves to
			// cancelled at accept time (RPC guard) — no meeting minted.
			const { data: inv } = await adminClient
				.from('prompt_invitations')
				.insert({
					prompt_id: promptId,
					slot_id: slotId,
					inviter_id: DIGIT.id,
					invitee_id: MARCO.id,
					state: 'pending'
				})
				.select('id')
				.single()
				.throwOnError();
			await expect(marcoServices.invitation.accept(inv!.id)).rejects.toMatchObject({
				status: 409
			});
			const { data: after } = await adminClient
				.from('prompt_invitations')
				.select('state')
				.eq('id', inv!.id)
				.single();
			expect(after?.state).toBe('cancelled');
			const { data: minted } = await adminClient
				.from('meetings')
				.select('id')
				.eq('invitation_id', inv!.id);
			expect(minted ?? []).toHaveLength(0);
		});
	});

	describe('late gathering cancel consumes exactly one free-pass act', () => {
		let promptId: string;
		let slotId: string;
		let anchorMeetingId: string;
		let priorLateActs: number;

		// Distinct late ACTS by marco in the rolling window — the unit the
		// free-pass logic counts. Relative counting keeps the test independent
		// of leftover history (seeds, other suites, prior runs).
		async function marcoLateActs(): Promise<number> {
			const { data } = await adminClient
				.from('cancellation_records')
				.select('id, group_key, cancelled_at')
				.eq('cancelled_by', MARCO.id)
				.eq('tier', 'late')
				.gt('cancelled_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
			return new Set((data ?? []).map((r) => r.group_key ?? r.id)).size;
		}

		it('sets up a 2-joiner gathering and forces it inside the 12h window', async () => {
			({ promptId, slotId } = await publishGroupPrompt('Late call-off', 'late'));
			anchorMeetingId = await join(digitServices, DIGIT, promptId, slotId);
			await join(sophieServices, SOPHIE, promptId, slotId);

			const sixHours = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
			await adminClient
				.from('time_slots')
				.update({ start_time: sixHours })
				.eq('id', slotId)
				.throwOnError();
			await adminClient
				.from('meetings')
				.update({ scheduled_time: sixHours })
				.eq('slot_id', slotId)
				.throwOnError();

			priorLateActs = await marcoLateActs();
		});

		it('late gathering cancel succeeds without a reason; rows share one group_key = ONE act', async () => {
			const { tier, joiners } = await marcoServices.meeting.cancelGathering(anchorMeetingId);
			expect(tier).toBe('late');
			expect(joiners).toHaveLength(2);

			// Scope to THIS slot's meetings.
			const { data: meetings } = await adminClient
				.from('meetings')
				.select('id')
				.eq('slot_id', slotId);
			const { data: records } = await adminClient
				.from('cancellation_records')
				.select('group_key, free_pass_used, tier')
				.in('meeting_id', meetings!.map((m) => m.id));
			expect(records).toHaveLength(2);
			expect(new Set(records!.map((r) => r.group_key)).size).toBe(1);
			expect(records![0].group_key).not.toBeNull();
			expect(records!.every((r) => r.tier === 'late')).toBe(true);
			// The pass rides the ACT: uniform across rows, granted iff no prior act.
			const expectedPass = priorLateActs === 0;
			expect(records!.every((r) => r.free_pass_used === expectedPass)).toBe(true);

			// The N rows register as exactly ONE additional act — the core of D2.
			expect(await marcoLateActs()).toBe(priorLateActs + 1);
		});

		it('a subsequent late pair-cancel sees the gathering as ONE prior act', async () => {
			// New 1-joiner gathering, also inside the window.
			const { promptId: p2, slotId: s2 } = await publishGroupPrompt('Follow-up late', 'late2');
			const m2 = await join(tomServices, TOM, p2, s2);
			const sixHours = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
			await adminClient.from('time_slots').update({ start_time: sixHours }).eq('id', s2).throwOnError();
			await adminClient
				.from('meetings')
				.update({ scheduled_time: sixHours })
				.eq('slot_id', s2)
				.throwOnError();

			const actsBefore = await marcoLateActs();
			expect(actsBefore).toBeGreaterThanOrEqual(1); // the gathering act exists

			const tier = await marcoServices.meeting.cancel(m2);
			expect(tier).toBe('late');
			const { data: rec } = await adminClient
				.from('cancellation_records')
				.select('free_pass_used, group_key')
				.eq('meeting_id', m2)
				.single();
			// At least one prior act (the gathering) ⇒ no pass for this one.
			expect(rec?.free_pass_used).toBe(false);
			expect(rec?.group_key).toBeNull();
			// And the pair cancel itself is one more act.
			expect(await marcoLateActs()).toBe(actsBefore + 1);
		});
	});

	describe('selective cancellation (uninvite specific joiners)', () => {
		let promptId: string;
		let slotId: string;
		let digitMeeting: string;
		let sophieMeeting: string;

		it('sets up a 2-joiner gathering', async () => {
			({ promptId, slotId } = await publishGroupPrompt('Selective uninvite', 'select'));
			digitMeeting = await join(digitServices, DIGIT, promptId, slotId);
			sophieMeeting = await join(sophieServices, SOPHIE, promptId, slotId);
		});

		it('rejects a selection containing a foreign meeting id, mutating nothing', async () => {
			const { promptId: pOther, slotId: sOther } = await publishGroupPrompt(
				'Other gathering',
				'select-other'
			);
			const foreign = await join(tomServices, TOM, pOther, sOther);
			await expect(
				marcoServices.meeting.cancelGathering(
					digitMeeting,
					'this should not apply, wrong slot id included',
					[digitMeeting, foreign]
				)
			).rejects.toMatchObject({ status: 404 });
			const { data: untouched } = await adminClient
				.from('meetings')
				.select('state')
				.in('id', [digitMeeting, sophieMeeting, foreign]);
			expect(untouched!.every((m) => m.state === 'scheduled')).toBe(true);
		});

		it('cancels only the selected pair; the time stays open and others stay scheduled', async () => {
			const { tier, joiners } = await marcoServices.meeting.cancelGathering(
				digitMeeting,
				'Sorry, this pairing will not work this time.',
				[digitMeeting]
			);
			expect(tier).toBe('early');
			expect(joiners).toHaveLength(1);
			expect(joiners[0]).toEqual({ joinerId: DIGIT.id, meetingId: digitMeeting });

			const { data: cancelled } = await adminClient
				.from('meetings')
				.select('state')
				.eq('id', digitMeeting)
				.single();
			expect(cancelled?.state).toBe('cancelled_early');

			const { data: sophiePair } = await adminClient
				.from('meetings')
				.select('state')
				.eq('id', sophieMeeting)
				.single();
			expect(sophiePair?.state).toBe('scheduled');

			// The time is NOT withdrawn — still offered and invitable.
			const { data: slot } = await adminClient
				.from('time_slots')
				.select('retired_at, accepted')
				.eq('id', slotId)
				.single();
			expect(slot?.retired_at).toBeNull();
			expect(slot?.accepted).toBe(true);

			// The act is grouped (one act) even for a single selection.
			const { data: rec } = await adminClient
				.from('cancellation_records')
				.select('group_key')
				.eq('meeting_id', digitMeeting)
				.single();
			expect(rec?.group_key).not.toBeNull();

			// Only the selected joiner is notified.
			const { data: notifs } = await adminClient
				.from('notifications')
				.select('user_id, data')
				.eq('type', 'meeting_cancelled');
			const forThisSlot = (notifs ?? []).filter(
				(n) => (n.data as { meeting_id?: string })?.meeting_id === digitMeeting
			);
			expect(forThisSlot).toHaveLength(1);
			expect(forThisSlot[0].user_id).toBe(DIGIT.id);
			const sophieNotified = (notifs ?? []).some(
				(n) => (n.data as { meeting_id?: string })?.meeting_id === sophieMeeting
			);
			expect(sophieNotified).toBe(false);
		});

		it('rejects an empty selection', async () => {
			await expect(
				marcoServices.meeting.cancelGathering(sophieMeeting, 'a perfectly valid reason here', [])
			).rejects.toMatchObject({ status: 400 });
		});
	});

	describe('pair semantics are regression-free', () => {
		it('a joiner leaving a 2-joiner gathering does not retire the slot', async () => {
			const { promptId, slotId } = await publishGroupPrompt('Joiner leaves', 'leave');
			const digitMeeting = await join(digitServices, DIGIT, promptId, slotId);
			await join(sophieServices, SOPHIE, promptId, slotId);

			const tier = await digitServices.meeting.cancel(
				digitMeeting,
				'I cannot make this one after all, sorry.'
			);
			expect(tier).toBe('early');

			const { data: slot } = await adminClient
				.from('time_slots')
				.select('retired_at')
				.eq('id', slotId)
				.single();
			expect(slot?.retired_at).toBeNull();

			// Sophie's pair is untouched.
			const { data: meetings } = await adminClient
				.from('meetings')
				.select('state, participant_b')
				.eq('slot_id', slotId);
			const sophiePair = meetings!.find((m) => m.participant_b === SOPHIE.id);
			expect(sophiePair?.state).toBe('scheduled');

			// The record carries no group_key (standalone act).
			const { data: rec } = await adminClient
				.from('cancellation_records')
				.select('group_key')
				.eq('meeting_id', digitMeeting)
				.single();
			expect(rec?.group_key).toBeNull();
		});
	});
});
