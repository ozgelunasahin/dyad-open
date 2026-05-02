import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS,
	SEED_PROMPTS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

describe('Invitation lifecycle', () => {
	let digitClient: SupabaseClient;
	let digitServices: Services;
	let otherClient: SupabaseClient;
	let otherServices: Services;
	let adminClient: SupabaseClient;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanTestData(adminClient);
		digitClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
		digitServices = createServices(digitClient);
		otherClient = await createAuthenticatedClient(
			SEED_USERS.other.email,
			SEED_USERS.other.password
		);
		otherServices = createServices(otherClient);
	});

	describe('create and cancel', () => {
		let createdPromptId: string;
		let slotId: string;
		let invitationId: string;

		it('sets up a prompt with a slot for invitation testing', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Invitation test prompt',
				coverImageUrl: 'https://picsum.photos/seed/test/800/400'
			});
			createdPromptId = prompt.id;

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 2);

			await otherServices.promptCommand.publish(createdPromptId, SEED_USERS.other.id, [
				{
					start_time: tomorrow.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'inv-test-1',
						name: 'Test Venue',
						address: 'Teststr 1, 10999 Berlin',
						lat: 52.4988,
						lng: 13.4238
					}
				}
			]);

			// Get the slot ID
			const slots = await otherServices.promptQuery.getAvailableSlots(
				createdPromptId,
				SEED_USERS.other.id
			);
			expect(slots.length).toBe(1);
			slotId = slots[0].id;
		});

		it('digit creates an invitation for other\'s prompt', async () => {
			const invitation = await digitServices.invitation.create({
				promptId: createdPromptId,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id,
				message: 'Would love to discuss this'
			});

			expect(invitation.state).toBe('pending');
			expect(invitation.inviter_id).toBe(SEED_USERS.digit.id);
			expect(invitation.invitee_id).toBe(SEED_USERS.other.id);
			invitationId = invitation.id;
		});

		it('inviter can cancel (free action)', async () => {
			await digitServices.invitation.cancel(invitationId, SEED_USERS.digit.id);

			// Verify state changed
			const pending = await digitServices.invitation.getPendingForPrompt(
				createdPromptId,
				SEED_USERS.digit.id
			);
			expect(pending.find((i) => i.id === invitationId)).toBeUndefined();
		});

		it('can re-invite after cancellation (partial unique index)', async () => {
			const reinvite = await digitServices.invitation.create({
				promptId: createdPromptId,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id,
				message: 'Changed my mind, still interested'
			});

			expect(reinvite.state).toBe('pending');
			invitationId = reinvite.id;
		});
	});

	describe('accept', () => {
		let promptId: string;
		let slotId: string;
		let invitationId: string;

		it('sets up a fresh prompt for acceptance testing', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Accept test prompt',
				coverImageUrl: 'https://picsum.photos/seed/test/800/400'
			});
			promptId = prompt.id;

			const dayAfterTomorrow = new Date();
			dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

			await otherServices.promptCommand.publish(promptId, SEED_USERS.other.id, [
				{
					start_time: dayAfterTomorrow.toISOString(),
					duration_minutes: 90,
					location: {
						place_id: 'accept-test',
						name: 'Accept Venue',
						address: 'Acceptstr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(
				promptId,
				SEED_USERS.other.id
			);
			slotId = slots[0].id;

			const invitation = await digitServices.invitation.create({
				promptId,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});
			invitationId = invitation.id;
		});

		it('invitee accepts — meeting created atomically', async () => {
			const meetingId = await otherServices.invitation.accept(invitationId);
			expect(meetingId).toBeTruthy();
			expect(typeof meetingId).toBe('string');

			// Slot should now be marked as accepted
			const slots = await otherServices.promptQuery.getAvailableSlots(
				promptId,
				SEED_USERS.other.id
			);
			expect(slots.length).toBe(0); // no available slots left
		});

		it('accept inserts a meeting_response notification for the inviter', async () => {
			const { data: notifications } = await adminClient
				.from('notifications')
				.select('user_id, type, data')
				.eq('user_id', SEED_USERS.digit.id)
				.eq('type', 'meeting_response')
				.order('created_at', { ascending: false })
				.limit(1);

			const latest = notifications?.[0];
			expect(latest).toBeTruthy();
			expect((latest!.data as { kind?: string }).kind).toBe('accepted');
			expect((latest!.data as { invitation_id?: string }).invitation_id).toBe(invitationId);
		});
	});

	describe('decline', () => {
		let promptId: string;
		let slotId: string;
		let invitationId: string;

		it('sets up a fresh prompt for decline testing', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Decline test prompt',
				coverImageUrl: 'https://picsum.photos/seed/test/800/400'
			});
			promptId = prompt.id;

			const fiveDaysOut = new Date();
			fiveDaysOut.setDate(fiveDaysOut.getDate() + 5);

			await otherServices.promptCommand.publish(promptId, SEED_USERS.other.id, [
				{
					start_time: fiveDaysOut.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'decline-test',
						name: 'Decline Venue',
						address: 'Declinestr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(
				promptId,
				SEED_USERS.other.id
			);
			slotId = slots[0].id;

			const invitation = await digitServices.invitation.create({
				promptId,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});
			invitationId = invitation.id;
		});

		it('invitee declines with a reason — state moves to declined', async () => {
			await otherServices.invitation.decline(invitationId, 'Not the right time for me');

			const { data: row } = await adminClient
				.from('prompt_invitations')
				.select('state, resolved_at, decline_reason')
				.eq('id', invitationId)
				.single();

			expect(row?.state).toBe('declined');
			expect(row?.resolved_at).toBeTruthy();
			expect(row?.decline_reason).toBe('Not the right time for me');
		});

		it('decline inserts a meeting_response notification for the inviter', async () => {
			const { data: notifications } = await adminClient
				.from('notifications')
				.select('user_id, type, data')
				.eq('user_id', SEED_USERS.digit.id)
				.eq('type', 'meeting_response')
				.order('created_at', { ascending: false })
				.limit(1);

			const latest = notifications?.[0];
			expect(latest).toBeTruthy();
			expect((latest!.data as { kind?: string }).kind).toBe('declined');
			expect((latest!.data as { invitation_id?: string }).invitation_id).toBe(invitationId);
			expect((latest!.data as { reason?: string }).reason).toBe('Not the right time for me');
		});

		it('declining an already-resolved invitation throws', async () => {
			await expect(
				otherServices.invitation.decline(invitationId, 'second attempt')
			).rejects.toThrow();
		});
	});

	describe('expiry', () => {
		let promptId: string;
		let slotId: string;

		it('sets up a prompt with a near-future slot', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Expiry test prompt',
				coverImageUrl: 'https://picsum.photos/seed/test/800/400'
			});
			promptId = prompt.id;

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			await otherServices.promptCommand.publish(promptId, SEED_USERS.other.id, [
				{
					start_time: tomorrow.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'expiry-test',
						name: 'Expiry Venue',
						address: 'Expirystr 1, 10999 Berlin',
						lat: 52.49,
						lng: 13.42
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(
				promptId,
				SEED_USERS.other.id
			);
			slotId = slots[0].id;

			await digitServices.invitation.create({
				promptId,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});
		});

		it('expires invitations via function (called by admin client)', async () => {
			// Move the slot to the past — expire_stale_invitations expires at start_time <= NOW()
			await adminClient
				.from('time_slots')
				.update({ start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString() })
				.eq('id', slotId)
				.throwOnError();

			// Call expiry function via admin client (restricted to service_role)
			const { data: expiredCount, error } = await adminClient.rpc(
				'expire_stale_invitations'
			);
			expect(error).toBeNull();
			expect(expiredCount).toBeGreaterThanOrEqual(1);

			// Verify no pending invitations remain for this prompt
			const pending = await digitServices.invitation.getPendingForPrompt(
				promptId,
				SEED_USERS.digit.id
			);
			expect(pending.length).toBe(0);
		});
	});

	describe('slot modification expires pending invitations', () => {
		let promptId: string;
		let slotId: string;

		it('sets up a prompt with an invitation', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Slot modification test',
				coverImageUrl: 'https://picsum.photos/seed/test/800/400'
			});
			promptId = prompt.id;

			const threeDays = new Date();
			threeDays.setDate(threeDays.getDate() + 3);

			await otherServices.promptCommand.publish(promptId, SEED_USERS.other.id, [
				{
					start_time: threeDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'mod-test',
						name: 'Mod Venue',
						address: 'Modstr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.4
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(
				promptId,
				SEED_USERS.other.id
			);
			slotId = slots[0].id;

			await digitServices.invitation.create({
				promptId,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});
		});

		it('removing a slot expires its pending invitations', async () => {
			await otherServices.promptCommand.removeSlot(slotId, SEED_USERS.other.id);

			const pending = await digitServices.invitation.getPendingForPrompt(
				promptId,
				SEED_USERS.digit.id
			);
			expect(pending.length).toBe(0);
		});
	});

	afterAll(() => cleanTestData(adminClient));
});
