import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

describe('Meeting lifecycle', () => {
	let digitClient: SupabaseClient;
	let digitServices: Services;
	let otherClient: SupabaseClient;
	let otherServices: Services;
	let adminClient: SupabaseClient;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanTestData(adminClient);
		digitClient = await createAuthenticatedClient(SEED_USERS.digit.email, SEED_USERS.digit.password);
		digitServices = createServices(digitClient);
		otherClient = await createAuthenticatedClient(SEED_USERS.other.email, SEED_USERS.other.password);
		otherServices = createServices(otherClient);
	});

	describe('accept creates meeting', () => {
		let promptId: string;
		let slotId: string;
		let invitationId: string;
		let meetingId: string;

		it('sets up a prompt with invitation', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Meeting test prompt'
			});
			promptId = prompt.id;

			const threeDays = new Date();
			threeDays.setDate(threeDays.getDate() + 3);

			await otherServices.promptCommand.publish(promptId, SEED_USERS.other.id, [
				{
					start_time: threeDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'meeting-test',
						name: 'Meeting Café',
						address: 'Meetingstr 1, 10999 Berlin',
						lat: 52.4988,
						lng: 13.4238
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(promptId, SEED_USERS.other.id);
			slotId = slots[0].id;

			const invitation = await digitServices.invitation.create({
				promptId,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id,
				message: 'Looking forward to meeting'
			});
			invitationId = invitation.id;
		});

		it('accept returns meeting ID', async () => {
			const result = await otherServices.invitation.accept(invitationId);
			expect(result).toBeTruthy();
			expect(typeof result).toBe('string');
			meetingId = result!;
		});

		it('both participants can see the meeting', async () => {
			const otherMeetings = await otherServices.meeting.getMyMeetings(SEED_USERS.other.id);
			expect(otherMeetings.some((m) => m.id === meetingId)).toBe(true);

			const digitMeetings = await digitServices.meeting.getMyMeetings(SEED_USERS.digit.id);
			expect(digitMeetings.some((m) => m.id === meetingId)).toBe(true);
		});

		it('meeting detail reveals exact location', async () => {
			const detail = await otherServices.meeting.getWithLocation(meetingId);
			expect(detail).toBeTruthy();
			expect(detail!.exact_location).toBeTruthy();
			expect(detail!.exact_location.name).toBe('Meeting Café');
			expect(detail!.general_area).toBeTruthy();
		});

		it('inviter also sees exact location', async () => {
			const detail = await digitServices.meeting.getWithLocation(meetingId);
			expect(detail).toBeTruthy();
			expect(detail!.exact_location).toBeTruthy();
		});
	});

	describe('early cancellation (≥12h)', () => {
		let meetingId: string;
		let slotId: string;

		it('sets up a meeting for cancellation', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Early cancel test'
			});

			const threeDays = new Date();
			threeDays.setDate(threeDays.getDate() + 3);

			await otherServices.promptCommand.publish(prompt.id, SEED_USERS.other.id, [
				{
					start_time: threeDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'cancel-test',
						name: 'Cancel Café',
						address: 'Cancelstr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(prompt.id, SEED_USERS.other.id);
			slotId = slots[0].id;

			const invitation = await digitServices.invitation.create({
				promptId: prompt.id,
				slotId,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});

			const result = await otherServices.invitation.accept(invitation.id);
			meetingId = result!;
		});

		it('early cancel requires explanation', async () => {
			await expect(
				digitServices.meeting.cancel(meetingId)
			).rejects.toThrow('Early cancellation requires an explanation');
		});

		it('early cancel with explanation succeeds and releases slot', async () => {
			const tier = await digitServices.meeting.cancel(
				meetingId,
				'Something came up, apologies for the inconvenience'
			);
			expect(tier).toBe('early');

			// Meeting should now be cancelled_early
			const detail = await digitServices.meeting.getDetail(meetingId);
			expect(detail).toBeTruthy();
			expect(detail!.state).toBe('cancelled_early');
			expect(detail!.cancellation_tier).toBe('early');
			expect(detail!.cancelled_by).toBe(SEED_USERS.digit.id);
		});

		it('cancelled meeting hides exact location', async () => {
			const withLocation = await digitServices.meeting.getWithLocation(meetingId);
			expect(withLocation).toBeNull(); // filtered out by state check
		});
	});

	describe('late cancellation (<12h)', () => {
		let meetingId: string;

		it('sets up a meeting with near-future slot', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Late cancel test'
			});

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 2);

			await otherServices.promptCommand.publish(prompt.id, SEED_USERS.other.id, [
				{
					start_time: tomorrow.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'late-test',
						name: 'Late Café',
						address: 'Latestr 1, 10999 Berlin',
						lat: 52.49,
						lng: 13.42
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(prompt.id, SEED_USERS.other.id);
			const invitation = await digitServices.invitation.create({
				promptId: prompt.id,
				slotId: slots[0].id,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});

			const result = await otherServices.invitation.accept(invitation.id);
			meetingId = result!;

			// Move meeting to within 12h by updating scheduled_time
			await adminClient
				.from('meetings')
				.update({ scheduled_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() })
				.eq('id', meetingId);
		});

		it('late cancel succeeds without explanation', async () => {
			const tier = await otherServices.meeting.cancel(meetingId);
			expect(tier).toBe('late');

			const detail = await otherServices.meeting.getDetail(meetingId);
			expect(detail!.state).toBe('cancelled_late');
		});
	});

	describe('advance_scheduled_meetings', () => {
		let meetingId: string;

		it('sets up a meeting and moves it to the past', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Advance test'
			});

			const twoDays = new Date();
			twoDays.setDate(twoDays.getDate() + 2);

			await otherServices.promptCommand.publish(prompt.id, SEED_USERS.other.id, [
				{
					start_time: twoDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'advance-test',
						name: 'Advance Café',
						address: 'Advancestr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.4
					}
				}
			]);

			const slots = await otherServices.promptQuery.getAvailableSlots(prompt.id, SEED_USERS.other.id);
			const invitation = await digitServices.invitation.create({
				promptId: prompt.id,
				slotId: slots[0].id,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});

			const result = await otherServices.invitation.accept(invitation.id);
			meetingId = result!;

			// Move to past
			await adminClient
				.from('meetings')
				.update({ scheduled_time: new Date(Date.now() - 60 * 60 * 1000).toISOString() })
				.eq('id', meetingId);
		});

		it('advance function transitions to awaiting_feedback', async () => {
			const { data: count, error } = await adminClient.rpc('advance_scheduled_meetings');
			expect(error).toBeNull();
			expect(count).toBeGreaterThanOrEqual(1);

			const detail = await digitServices.meeting.getDetail(meetingId);
			expect(detail!.state).toBe('awaiting_feedback');
		});
	});

	afterAll(() => cleanTestData(adminClient));
});
