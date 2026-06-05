import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	TEST_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';

// ── Expiry-boundary safeguards (U7) ─────────────────────────────────────
//
// R12: an invitation cannot be accepted for a slot starting after either
// party's access window ends (accept_invitation guard, 20260605100500).
// R13: a member is never feedback-gated on a one-on-one reveal whose
// counterpart is access-expired (my_feedback_gate, 20260605100600).
//
// Seed note: sophie and tom are NOT feedback-gated in the seed, so
// checkGate sees only the rows this file mints.

const SOPHIE = TEST_USERS.sophie; // author / invitee
const TOM = TEST_USERS.tom; // responder / inviter

const FUTURE_DAYS = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

describe('Expiry-boundary safeguards (U7)', () => {
	let admin: SupabaseClient;
	let sophieServices: Services;
	let tomServices: Services;
	const createdPromptIds: string[] = [];

	async function clearStamps(): Promise<void> {
		await admin
			.from('profiles')
			.update({ access_expires_at: null, home_scope: null })
			.in('id', [SOPHIE.id, TOM.id]);
	}

	beforeAll(async () => {
		admin = createAdminClient();
		await clearStamps();
		const sophieClient = await createAuthenticatedClient(SOPHIE.email, SOPHIE.password);
		sophieServices = createServices(sophieClient);
		const tomClient = await createAuthenticatedClient(TOM.email, TOM.password);
		tomServices = createServices(tomClient);
	});

	afterAll(async () => {
		await clearStamps();
		if (createdPromptIds.length > 0) {
			const { data: meetings } = await admin
				.from('meetings')
				.select('id')
				.in('prompt_id', createdPromptIds);
			const meetingIds = (meetings ?? []).map((m) => m.id);
			if (meetingIds.length > 0) {
				await admin.from('feedback_forms').delete().in('meeting_id', meetingIds);
			}
			await admin.from('group_feedback').delete().in('prompt_id', createdPromptIds);
			await admin.from('meetings').delete().in('prompt_id', createdPromptIds);
			await admin.from('prompt_invitations').delete().in('prompt_id', createdPromptIds);
			await admin.from('time_slots').delete().in('prompt_id', createdPromptIds);
			await admin.from('prompts').delete().in('id', createdPromptIds);
		}
	});

	/** Publish a one-slot prompt by sophie; return ids. Slot at +3 days. */
	async function publishPrompt(suffix: string): Promise<{ promptId: string; slotId: string }> {
		const prompt = await sophieServices.promptCommand.create(SOPHIE.id, {
			title: `Expiry boundary ${suffix}`,
			coverImageUrl: 'https://picsum.photos/seed/expiry/800/400'
		});
		createdPromptIds.push(prompt.id);
		await sophieServices.promptCommand.publish(
			prompt.id,
			SOPHIE.id,
			[
				{
					start_time: FUTURE_DAYS(3),
					duration_minutes: 60,
					location: {
						place_id: `expiry-${suffix}`,
						name: 'Boundary Venue',
						address: 'Grenzstr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			],
			null,
			1
		);
		const slots = await sophieServices.promptQuery.getAvailableSlots(prompt.id, SOPHIE.id);
		expect(slots.length).toBe(1);
		return { promptId: prompt.id, slotId: slots[0].id };
	}

	async function invite(promptId: string, slotId: string): Promise<string> {
		const inv = await tomServices.invitation.create({
			promptId,
			slotId,
			inviterId: TOM.id,
			inviteeId: SOPHIE.id
		});
		return inv.id;
	}

	it('R12: rejects an accept when the ACCEPTING party\'s window ends before the slot', async () => {
		const { promptId, slotId } = await publishPrompt('invitee');
		const invitationId = await invite(promptId, slotId);

		// Sophie (accepting invitee) expires before the slot starts.
		await admin
			.from('profiles')
			.update({ access_expires_at: FUTURE_DAYS(1) })
			.eq('id', SOPHIE.id);

		await expect(sophieServices.invitation.accept(invitationId)).rejects.toThrow(
			'after access ends'
		);

		// With the stamp cleared the same invitation accepts cleanly.
		await clearStamps();
		const meetingId = await sophieServices.invitation.accept(invitationId);
		expect(meetingId).toBeTruthy();
	});

	it('R12: rejects an accept when the INVITER\'s window ends before the slot', async () => {
		const { promptId, slotId } = await publishPrompt('inviter');
		const invitationId = await invite(promptId, slotId);

		// Tom (inviter) expires before the slot starts.
		await admin
			.from('profiles')
			.update({ access_expires_at: FUTURE_DAYS(1) })
			.eq('id', TOM.id);

		await expect(sophieServices.invitation.accept(invitationId)).rejects.toThrow(
			'after access ends'
		);
		await clearStamps();
	});

	it('R12: a window ending AFTER the slot does not block the accept', async () => {
		const { promptId, slotId } = await publishPrompt('within');
		const invitationId = await invite(promptId, slotId);

		// Guest window covers the slot (+5 days > +3 days slot).
		await admin
			.from('profiles')
			.update({ access_expires_at: FUTURE_DAYS(5) })
			.eq('id', SOPHIE.id);

		const meetingId = await sophieServices.invitation.accept(invitationId);
		expect(meetingId).toBeTruthy();
		await clearStamps();
	});

	it('R13: a due one-on-one form whose counterpart is expired does not gate the member', async () => {
		// Build a meeting between sophie and tom.
		const { promptId, slotId } = await publishPrompt('gate');
		const invitationId = await invite(promptId, slotId);
		const meetingId = await sophieServices.invitation.accept(invitationId);

		// Mint due feedback forms for both participants.
		await admin.from('feedback_forms').insert([
			{ meeting_id: meetingId, reviewer_id: SOPHIE.id, reviewee_id: TOM.id, state: 'due' },
			{ meeting_id: meetingId, reviewer_id: TOM.id, reviewee_id: SOPHIE.id, state: 'due' }
		]).throwOnError();

		// Sanity: with both parties active, sophie IS gated.
		const gatedBefore = await sophieServices.gate.checkGate(SOPHIE.id);
		expect(gatedBefore.gated).toBe(true);

		// Tom's access expires — sophie's gate must release.
		await admin
			.from('profiles')
			.update({ access_expires_at: new Date(Date.now() - 3600_000).toISOString() })
			.eq('id', TOM.id);

		const gatedAfter = await sophieServices.gate.checkGate(SOPHIE.id);
		expect(gatedAfter.gated).toBe(false);

		await clearStamps();
		// Drop this test's forms so they don't outrank the group test's row
		// once tom is un-expired again.
		await admin.from('feedback_forms').delete().eq('meeting_id', meetingId);
	});

	it('R13: the group path still gates independently of counterpart expiry', async () => {
		const { promptId, slotId } = await publishPrompt('group-gate');

		await admin.from('group_feedback').insert({
			prompt_id: promptId,
			slot_id: slotId,
			reviewer_id: SOPHIE.id,
			state: 'due'
		}).throwOnError();

		const gated = await sophieServices.gate.checkGate(SOPHIE.id);
		expect(gated.gated).toBe(true);
		expect(gated.gated && gated.kind).toBe('group');
	});
});
