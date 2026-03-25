import { describe, it, expect, beforeAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS,
	SEED_PROMPTS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';

describe('Invitation lifecycle', () => {
	let digitClient: SupabaseClient;
	let digitServices: Services;
	let otherClient: SupabaseClient;
	let otherServices: Services;
	let adminClient: SupabaseClient;

	beforeAll(async () => {
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
		adminClient = createAdminClient();
	});

	describe('create and cancel', () => {
		let createdPromptId: string;
		let slotId: string;
		let invitationId: string;

		it('sets up a prompt with a slot for invitation testing', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Invitation test prompt'
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
				title: 'Accept test prompt'
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

		it('invitee accepts — slot is booked atomically', async () => {
			const accepted = await otherServices.invitation.accept(invitationId);
			expect(accepted).toBe(true);

			// Slot should now be marked as accepted
			const slots = await otherServices.promptQuery.getAvailableSlots(
				promptId,
				SEED_USERS.other.id
			);
			expect(slots.length).toBe(0); // no available slots left
		});
	});

	describe('expiry', () => {
		let promptId: string;
		let slotId: string;

		it('sets up a prompt with a near-future slot', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Expiry test prompt'
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
			// Move the slot to within 12h by updating start_time
			await otherClient
				.from('time_slots')
				.update({ start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() })
				.eq('id', slotId);

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
				title: 'Slot modification test'
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
});
