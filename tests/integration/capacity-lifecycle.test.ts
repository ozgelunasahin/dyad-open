import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	TEST_USERS,
	SEED_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

// ── Behavioural coverage for per-conversation capacity (U4/U5/U9/U10/U11) ──
//
// A "group gathering" is one time_slot with N two-person meetings sharing it:
// the author (= invitee = participant_a on every meeting) paired independently
// with each joiner (= a distinct inviter = participant_b). Capacity is the
// prompt's per-slot joiner cap. Seat-occupancy predicate everywhere is
// state IN ('scheduled','awaiting_feedback').
//
// Each joiner needs a DISTINCT identity because accept_invitation rejects a
// second active meeting for the same inviter on a slot.
//
// Seed note: marco, ava, ben are feedback-GATED in the seed; sophie, tom, lisa
// are not. The group-gate sub-test therefore uses a non-gated author (sophie)
// so checkGate sees only the group form it minted, not a seed gate.

const TEST_SCOPE = 'cap-test-scope';

describe('Capacity + group feedback lifecycle', () => {
	let adminClient: SupabaseClient;

	// marco authors most prompts (gating doesn't matter except for the gate test).
	let marcoClient: SupabaseClient;
	let marcoServices: Services;
	// sophie authors the group-gate prompt (not feedback-gated in the seed).
	let sophieClient: SupabaseClient;
	let sophieServices: Services;

	// Distinct joiners (inviters).
	let digitClient: SupabaseClient;
	let digitServices: Services;
	let tomClient: SupabaseClient;
	let tomServices: Services;

	const MARCO = SEED_USERS.other; // marco
	const DIGIT = SEED_USERS.digit; // lisa
	const SOPHIE = TEST_USERS.sophie;
	const TOM = TEST_USERS.tom;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanTestData(adminClient);

		marcoClient = await createAuthenticatedClient(MARCO.email, MARCO.password);
		marcoServices = createServices(marcoClient);
		sophieClient = await createAuthenticatedClient(SOPHIE.email, SOPHIE.password);
		sophieServices = createServices(sophieClient);
		digitClient = await createAuthenticatedClient(DIGIT.email, DIGIT.password);
		digitServices = createServices(digitClient);
		tomClient = await createAuthenticatedClient(TOM.email, TOM.password);
		tomServices = createServices(tomClient);
	});

	// Publish a prompt (by `author`) at a given capacity with one future slot.
	// publish() defaults capacity to 1 when null is passed, so a true NULL
	// (legacy unlimited) is produced by publishing at 1 then admin-forcing NULL.
	async function publishWithCapacity(opts: {
		author: { id: string };
		authorServices: Services;
		capacity: number | null;
		title: string;
		placeIdSuffix: string;
	}): Promise<{ promptId: string; slotId: string }> {
		const prompt = await opts.authorServices.promptCommand.create(opts.author.id, {
			title: opts.title,
			coverImageUrl: 'https://picsum.photos/seed/cap/800/400'
		});

		const threeDays = new Date();
		threeDays.setDate(threeDays.getDate() + 3);

		await opts.authorServices.promptCommand.publish(
			prompt.id,
			opts.author.id,
			[
				{
					start_time: threeDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: `cap-${opts.placeIdSuffix}`,
						name: 'Capacity Venue',
						address: 'Capstr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			],
			null,
			opts.capacity ?? 1
		);

		const slots = await opts.authorServices.promptQuery.getAvailableSlots(
			prompt.id,
			opts.author.id
		);
		expect(slots.length).toBe(1);

		if (opts.capacity === null) {
			await adminClient
				.from('prompts')
				.update({ capacity: null })
				.eq('id', prompt.id)
				.throwOnError();
		}

		return { promptId: prompt.id, slotId: slots[0].id };
	}

	// A distinct inviter creates a pending invitation on a slot (invitee = author).
	async function invite(
		inviterServices: Services,
		inviterId: string,
		inviteeId: string,
		promptId: string,
		slotId: string
	): Promise<string> {
		const inv = await inviterServices.invitation.create({
			promptId,
			slotId,
			inviterId,
			inviteeId
		});
		return inv.id;
	}

	describe('capacity = 1 (one-on-one)', () => {
		let promptId: string;
		let slotId: string;
		let firstInvitationId: string;
		let secondInvitationId: string;

		it('sets up a capacity=1 prompt and two pending invitations from distinct inviters', async () => {
			({ promptId, slotId } = await publishWithCapacity({
				author: MARCO,
				authorServices: marcoServices,
				capacity: 1,
				title: 'Cap=1 prompt',
				placeIdSuffix: 'one'
			}));
			firstInvitationId = await invite(digitServices, DIGIT.id, MARCO.id, promptId, slotId);
			secondInvitationId = await invite(sophieServices, SOPHIE.id, MARCO.id, promptId, slotId);
			expect(firstInvitationId).toBeTruthy();
			expect(secondInvitationId).toBeTruthy();
		});

		it('first accept succeeds — meeting created', async () => {
			const meetingId = await marcoServices.invitation.accept(firstInvitationId);
			expect(meetingId).toBeTruthy();
		});

		it('second distinct accept on the full slot throws DomainError (409)', async () => {
			await expect(marcoServices.invitation.accept(secondInvitationId)).rejects.toMatchObject({
				status: 409
			});
		});

		it('rejected invitation ends cancelled with no meeting row and no notification', async () => {
			const { data: inv } = await adminClient
				.from('prompt_invitations')
				.select('state')
				.eq('id', secondInvitationId)
				.single();
			expect(inv?.state).toBe('cancelled');

			const { data: meetings } = await adminClient
				.from('meetings')
				.select('id')
				.eq('invitation_id', secondInvitationId);
			expect(meetings ?? []).toHaveLength(0);

			// No meeting_response notification tied to THIS rejected invitation.
			const { data: notifs } = await adminClient
				.from('notifications')
				.select('id, data')
				.eq('user_id', SOPHIE.id)
				.eq('type', 'meeting_response');
			const forThisInvite = (notifs ?? []).filter(
				(n) => (n.data as { invitation_id?: string }).invitation_id === secondInvitationId
			);
			expect(forThisInvite).toHaveLength(0);
		});
	});

	describe('capacity = 2 (small group)', () => {
		let promptId: string;
		let slotId: string;
		let invA: string;
		let invB: string;
		let invC: string;

		it('sets up a capacity=2 prompt and three pending invitations', async () => {
			({ promptId, slotId } = await publishWithCapacity({
				author: MARCO,
				authorServices: marcoServices,
				capacity: 2,
				title: 'Cap=2 prompt',
				placeIdSuffix: 'two'
			}));
			invA = await invite(digitServices, DIGIT.id, MARCO.id, promptId, slotId);
			invB = await invite(sophieServices, SOPHIE.id, MARCO.id, promptId, slotId);
			invC = await invite(tomServices, TOM.id, MARCO.id, promptId, slotId);
		});

		it('two accepts succeed, third is rejected (409)', async () => {
			const m1 = await marcoServices.invitation.accept(invA);
			const m2 = await marcoServices.invitation.accept(invB);
			expect(m1).toBeTruthy();
			expect(m2).toBeTruthy();

			await expect(marcoServices.invitation.accept(invC)).rejects.toMatchObject({
				status: 409
			});

			const { data: meetings } = await adminClient
				.from('meetings')
				.select('id, state')
				.eq('slot_id', slotId)
				.in('state', ['scheduled', 'awaiting_feedback']);
			expect(meetings ?? []).toHaveLength(2);
		});
	});

	describe('capacity = NULL (legacy unlimited)', () => {
		let promptId: string;
		let slotId: string;

		it('sets up a capacity=NULL prompt (admin-forced)', async () => {
			({ promptId, slotId } = await publishWithCapacity({
				author: MARCO,
				authorServices: marcoServices,
				capacity: null,
				title: 'Cap=NULL prompt',
				placeIdSuffix: 'null'
			}));

			const { data: row } = await adminClient
				.from('prompts')
				.select('capacity')
				.eq('id', promptId)
				.single();
			expect(row?.capacity).toBeNull();
		});

		it('two or more accepts both succeed under unlimited capacity', async () => {
			const inv1 = await invite(digitServices, DIGIT.id, MARCO.id, promptId, slotId);
			const inv2 = await invite(sophieServices, SOPHIE.id, MARCO.id, promptId, slotId);
			const m1 = await marcoServices.invitation.accept(inv1);
			const m2 = await marcoServices.invitation.accept(inv2);
			expect(m1).toBeTruthy();
			expect(m2).toBeTruthy();
		});
	});

	describe('group feedback advance (capacity = 2, two joiners)', () => {
		// Author = sophie (NOT feedback-gated in the seed), joiners = digit + tom.
		let promptId: string;
		let slotId: string;
		let meetingIds: string[] = [];

		it('two distinct inviters accept the same slot — two meetings', async () => {
			({ promptId, slotId } = await publishWithCapacity({
				author: SOPHIE,
				authorServices: sophieServices,
				capacity: 2,
				title: 'Group advance prompt',
				placeIdSuffix: 'grp'
			}));
			const invA = await invite(digitServices, DIGIT.id, SOPHIE.id, promptId, slotId);
			const invB = await invite(tomServices, TOM.id, SOPHIE.id, promptId, slotId);
			const m1 = await sophieServices.invitation.accept(invA);
			const m2 = await sophieServices.invitation.accept(invB);
			meetingIds = [m1, m2];
			expect(meetingIds).toHaveLength(2);
		});

		it('advance completes both meetings, mints group_feedback (not per-pair forms)', async () => {
			const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
			await adminClient.from('time_slots').update({ start_time: past }).eq('id', slotId).throwOnError();
			await adminClient
				.from('meetings')
				.update({ scheduled_time: past })
				.eq('slot_id', slotId)
				.throwOnError();

			const { data: count, error } = await adminClient.rpc('advance_scheduled_meetings');
			expect(error).toBeNull();
			expect(count).toBeGreaterThanOrEqual(2);

			// Both meetings completed.
			const { data: meetings } = await adminClient
				.from('meetings')
				.select('id, state')
				.in('id', meetingIds);
			expect(meetings ?? []).toHaveLength(2);
			for (const m of meetings ?? []) expect(m.state).toBe('completed');

			// ZERO per-pair feedback_forms for these meetings.
			const { data: forms } = await adminClient
				.from('feedback_forms')
				.select('id')
				.in('meeting_id', meetingIds);
			expect(forms ?? []).toHaveLength(0);

			// Exactly 3 group_feedback rows (author + 2 joiners), all 'due'.
			const { data: groupForms } = await adminClient
				.from('group_feedback')
				.select('id, reviewer_id, state')
				.eq('slot_id', slotId);
			expect(groupForms ?? []).toHaveLength(3);
			for (const g of groupForms ?? []) expect(g.state).toBe('due');

			const reviewerIds = new Set((groupForms ?? []).map((g) => g.reviewer_id));
			expect(reviewerIds).toEqual(new Set([SOPHIE.id, DIGIT.id, TOM.id]));
		});

		it('author group gate: gated=true with kind=group form id; submit clears it', async () => {
			const gated = await sophieServices.gate.checkGate(SOPHIE.id);
			expect(gated.gated).toBe(true);
			if (!gated.gated) throw new Error('expected gated');
			expect(gated.kind).toBe('group');
			expect(gated.formId).toBeTruthy();

			await sophieServices.feedback.submitGroupFeedback(gated.formId, {
				meet_again: true
			});

			const after = await sophieServices.gate.checkGate(SOPHIE.id);
			expect(after.gated).toBe(false);
		});
	});

	describe('one-on-one regression (capacity = 1, single meeting)', () => {
		let promptId: string;
		let slotId: string;
		let meetingId: string;

		it('one accept then advance → two directional feedback_forms, zero group_feedback', async () => {
			({ promptId, slotId } = await publishWithCapacity({
				author: MARCO,
				authorServices: marcoServices,
				capacity: 1,
				title: '1:1 regression prompt',
				placeIdSuffix: 'oo'
			}));
			const inv = await invite(tomServices, TOM.id, MARCO.id, promptId, slotId);
			meetingId = await marcoServices.invitation.accept(inv);
			expect(meetingId).toBeTruthy();

			const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
			await adminClient.from('time_slots').update({ start_time: past }).eq('id', slotId).throwOnError();
			await adminClient
				.from('meetings')
				.update({ scheduled_time: past })
				.eq('id', meetingId)
				.throwOnError();

			const { error } = await adminClient.rpc('advance_scheduled_meetings');
			expect(error).toBeNull();

			// Exactly two directional feedback_forms for the single meeting.
			const { data: forms } = await adminClient
				.from('feedback_forms')
				.select('id, reviewer_id, reviewee_id')
				.eq('meeting_id', meetingId);
			expect(forms ?? []).toHaveLength(2);
			const pairs = new Set((forms ?? []).map((f) => `${f.reviewer_id}->${f.reviewee_id}`));
			expect(pairs).toEqual(new Set([`${MARCO.id}->${TOM.id}`, `${TOM.id}->${MARCO.id}`]));

			// Zero group_feedback rows for this slot.
			const { data: groupForms } = await adminClient
				.from('group_feedback')
				.select('id')
				.eq('slot_id', slotId);
			expect(groupForms ?? []).toHaveLength(0);
		});
	});

	describe('occupancy RPC (get_prompt_slot_occupancy)', () => {
		it('author of a prompt with 1 accepted meeting sees occupied=1 for that slot', async () => {
			const { promptId, slotId } = await publishWithCapacity({
				author: MARCO,
				authorServices: marcoServices,
				capacity: 2,
				title: 'Occupancy prompt',
				placeIdSuffix: 'occ'
			});
			const inv = await invite(digitServices, DIGIT.id, MARCO.id, promptId, slotId);
			await marcoServices.invitation.accept(inv);

			const { data, error } = await marcoClient.rpc('get_prompt_slot_occupancy', {
				p_prompt_id: promptId
			});
			expect(error).toBeNull();
			const row = ((data ?? []) as Array<{ slot_id: string; occupied: number }>).find(
				(r) => r.slot_id === slotId
			);
			expect(row?.occupied).toBe(1);
		});

		it('a slot with 0 meetings reports occupied=0', async () => {
			const { promptId, slotId } = await publishWithCapacity({
				author: MARCO,
				authorServices: marcoServices,
				capacity: 2,
				title: 'Empty occupancy prompt',
				placeIdSuffix: 'occ0'
			});
			const { data } = await marcoClient.rpc('get_prompt_slot_occupancy', {
				p_prompt_id: promptId
			});
			const row = ((data ?? []) as Array<{ slot_id: string; occupied: number }>).find(
				(r) => r.slot_id === slotId
			);
			expect(row?.occupied).toBe(0);
		});

		it('a user with no audience-scope grant on a scoped prompt gets an empty result', async () => {
			// Create a scope nobody-but-the-author holds, then point the prompt at
			// it. The RPC re-implements the audience-scope check, so a non-grantee
			// (digit) must get an empty set.
			await adminClient
				.from('scopes')
				.insert({
					scope: TEST_SCOPE,
					name: 'Capacity test scope',
					description: 'Used to test occupancy-RPC audience gating.',
					created_by: MARCO.id
				})
				.throwOnError();
			// Author needs the grant to keep the prompt valid.
			await adminClient
				.from('identity_scopes')
				.insert({ identity_id: MARCO.id, scope: TEST_SCOPE, granted_by: MARCO.id })
				.throwOnError();

			const { promptId } = await publishWithCapacity({
				author: MARCO,
				authorServices: marcoServices,
				capacity: 2,
				title: 'Scoped prompt',
				placeIdSuffix: 'scoped'
			});
			await adminClient
				.from('prompts')
				.update({ audience_scope: TEST_SCOPE })
				.eq('id', promptId)
				.throwOnError();

			// digit holds no grant for TEST_SCOPE → empty result.
			const { data, error } = await digitClient.rpc('get_prompt_slot_occupancy', {
				p_prompt_id: promptId
			});
			expect(error).toBeNull();
			expect(data ?? []).toHaveLength(0);
		});
	});

	afterAll(async () => {
		// Reverse the scope fixtures (prompts referencing the scope are dropped by
		// cleanTestData first, then the grant + scope row).
		await cleanTestData(adminClient);
		await adminClient.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
		await adminClient.from('scopes').delete().eq('scope', TEST_SCOPE);
	});
});
