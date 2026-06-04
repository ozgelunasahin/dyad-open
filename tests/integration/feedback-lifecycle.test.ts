import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

describe('Feedback lifecycle', () => {
	let digitClient: SupabaseClient;
	let digitServices: Services;
	let otherClient: SupabaseClient;
	let otherServices: Services;
	let adminClient: SupabaseClient;

	let meetingId: string;
	let digitFormId: string;
	let otherFormId: string;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanTestData(adminClient);
		digitClient = await createAuthenticatedClient(SEED_USERS.digit.email, SEED_USERS.digit.password);
		digitServices = createServices(digitClient);
		otherClient = await createAuthenticatedClient(SEED_USERS.other.email, SEED_USERS.other.password);
		otherServices = createServices(otherClient);
	});

	describe('setup: create a meeting and advance it', () => {
		it('creates a prompt, invitation, and meeting', async () => {
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Feedback test prompt',
				coverImageUrl: 'https://picsum.photos/seed/test/800/400'
			});

			const twoDays = new Date();
			twoDays.setDate(twoDays.getDate() + 2);

			await otherServices.promptCommand.publish(prompt.id, SEED_USERS.other.id, [
				{
					start_time: twoDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'feedback-test',
						name: 'Feedback Café',
						address: 'Feedbackstr 1, 10999 Berlin',
						lat: 52.4988,
						lng: 13.4238
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
			expect(meetingId).toBeTruthy();
		});

		it('advance creates feedback forms for both participants', async () => {
			// Move meeting to past
			await adminClient
				.from('meetings')
				.update({ scheduled_time: new Date(Date.now() - 60 * 60 * 1000).toISOString() })
				.eq('id', meetingId);

			const { data: count, error } = await adminClient.rpc('advance_scheduled_meetings');
			expect(error).toBeNull();
			expect(count).toBeGreaterThanOrEqual(1);

			// Both participants should have feedback forms in 'due' state
			const digitForm = await digitServices.feedback.getMyForm(meetingId, SEED_USERS.digit.id);
			expect(digitForm).toBeTruthy();
			expect(digitForm!.state).toBe('due');
			digitFormId = digitForm!.id;

			const otherForm = await otherServices.feedback.getMyForm(meetingId, SEED_USERS.other.id);
			expect(otherForm).toBeTruthy();
			expect(otherForm!.state).toBe('due');
			otherFormId = otherForm!.id;
		});
	});

	describe('gate check', () => {
		it('digit is gated (has due form)', async () => {
			const status = await digitServices.gate.checkGate(SEED_USERS.digit.id);
			expect(status.gated).toBe(true);
			expect(status.gated && status.kind).toBe('one_on_one');
			expect(status.gated && status.formId).toBeTruthy();
		});

		it('other is gated (has due form)', async () => {
			const status = await otherServices.gate.checkGate(SEED_USERS.other.id);
			expect(status.gated).toBe(true);
			expect(status.gated && status.kind).toBe('one_on_one');
			expect(status.gated && status.formId).toBeTruthy();
		});
	});

	describe('submit feedback', () => {
		it('digit submits feedback — state becomes submitted', async () => {
			const newState = await digitServices.feedback.submit(digitFormId, {
				did_meet: true,
				rating_tags: ['thoughtful', 'curious'],
				share_with_person: 'Great conversation, would love to do it again.',
				share_with_platform: 'Everything went smoothly.'
			});
			expect(newState).toBe('submitted');
		});

		it('digit form is now submitted (no longer due)', async () => {
			const form = await digitServices.feedback.getMyForm(meetingId, SEED_USERS.digit.id);
			expect(form!.state).toBe('submitted');
		});

		it('other form is still due', async () => {
			const form = await otherServices.feedback.getMyForm(meetingId, SEED_USERS.other.id);
			expect(form!.state).toBe('due');
		});

		it('digit can edit submitted feedback', async () => {
			const newState = await digitServices.feedback.submit(digitFormId, {
				did_meet: true,
				rating_tags: ['thoughtful', 'warm'],
				share_with_person: 'Updated: Great conversation!',
				share_with_platform: 'Everything went smoothly.'
			});
			expect(newState).toBe('submitted');
		});

		it('no revealed feedback yet (only one submitted)', async () => {
			const revealed = await digitServices.feedback.getRevealedFeedback(meetingId, SEED_USERS.digit.id);
			expect(revealed.length).toBe(0);
		});
	});

	describe('simultaneous lock + reveal', () => {
		it('other submits — both forms lock', async () => {
			const newState = await otherServices.feedback.submit(otherFormId, {
				did_meet: true,
				rating_tags: ['engaging', 'kind'],
				share_with_person: 'Enjoyed meeting you!',
				share_with_platform: 'Good experience overall.'
			});
			expect(newState).toBe('locked');
		});

		it('both forms are now locked', async () => {
			const digitForm = await digitServices.feedback.getMyForm(meetingId, SEED_USERS.digit.id);
			expect(digitForm!.state).toBe('locked');

			const otherForm = await otherServices.feedback.getMyForm(meetingId, SEED_USERS.other.id);
			expect(otherForm!.state).toBe('locked');
		});

		it('meeting is now completed', async () => {
			const detail = await digitServices.meeting.getDetail(meetingId);
			expect(detail!.state).toBe('completed');
		});

		it('digit sees revealed feedback from other', async () => {
			const revealed = await digitServices.feedback.getRevealedFeedback(meetingId, SEED_USERS.digit.id);
			expect(revealed.length).toBe(1);
			expect(revealed[0].share_with_person).toBe('Enjoyed meeting you!');
			expect(revealed[0].rating_tags).toContain('engaging');
		});

		it('other sees revealed feedback from digit', async () => {
			const revealed = await otherServices.feedback.getRevealedFeedback(meetingId, SEED_USERS.other.id);
			expect(revealed.length).toBe(1);
			expect(revealed[0].share_with_person).toBe('Updated: Great conversation!');
			expect(revealed[0].rating_tags).toContain('warm');
		});

		it('locked forms cannot be edited', async () => {
			await expect(
				digitServices.feedback.submit(digitFormId, { did_meet: true })
			).rejects.toThrow('Form not found or not editable');
		});
	});

	describe('vocabulary', () => {
		it('returns seeded adjectives', async () => {
			const words = await digitServices.feedback.getVocabulary();
			expect(words.length).toBeGreaterThanOrEqual(12);
			expect(words).toContain('thoughtful');
			expect(words).toContain('curious');
		});

		it('rejects invalid rating tags', async () => {
			// Create a new meeting for this test
			const prompt = await otherServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Vocab validation test',
				coverImageUrl: 'https://picsum.photos/seed/test/800/400'
			});
			const twoDays = new Date();
			twoDays.setDate(twoDays.getDate() + 2);
			await otherServices.promptCommand.publish(prompt.id, SEED_USERS.other.id, [
				{
					start_time: twoDays.toISOString(),
					duration_minutes: 60,
					location: { place_id: 'v', name: 'V', address: 'V 1, 10999 Berlin', lat: 52.5, lng: 13.4 }
				}
			]);
			const slots = await otherServices.promptQuery.getAvailableSlots(prompt.id, SEED_USERS.other.id);
			const inv = await digitServices.invitation.create({
				promptId: prompt.id,
				slotId: slots[0].id,
				inviterId: SEED_USERS.digit.id,
				inviteeId: SEED_USERS.other.id
			});
			const mid = await otherServices.invitation.accept(inv.id);
			await adminClient.from('meetings').update({ scheduled_time: new Date(Date.now() - 3600000).toISOString() }).eq('id', mid);
			await adminClient.rpc('advance_scheduled_meetings');
			const form = await digitServices.feedback.getMyForm(mid!, SEED_USERS.digit.id);

			await expect(
				digitServices.feedback.submit(form!.id, {
					did_meet: true,
					rating_tags: ['INVALID_TAG']
				})
			).rejects.toThrow('Invalid rating tag');
		});
	});

	afterAll(() => cleanTestData(adminClient));
});
