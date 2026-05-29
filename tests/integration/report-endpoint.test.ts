import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	TEST_USERS,
	SEED_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';
import { POST } from '../../src/routes/api/meetings/[id]/report/+server.js';

// Interim "report a problem" safety floor (plan U7). The endpoint validates the
// report TARGET at the app layer: the reporter must be a participant of the
// referenced meeting, enforced by reading the meeting through the caller's
// RLS-scoped client (non-participants get no row → 403). The shared `feedback`
// table's INSERT policy stays permissive, so a non-participant could in theory
// insert a 'report' row directly — the endpoint is the gate that prevents it.
//
// These tests drive the real POST handler with a minimal `locals` carrying the
// caller's authenticated Supabase client + auth user, so RLS applies for real.

// Build a RequestEvent-shaped object good enough for the handler. The handler
// reads params.id, locals.user, locals.supabase, and request.json().
function makeEvent(opts: {
	meetingId: string;
	supabase: SupabaseClient;
	user: User;
	body: unknown;
}) {
	return {
		params: { id: opts.meetingId },
		locals: { supabase: opts.supabase, user: opts.user },
		request: new Request('http://localhost/api/meetings/x/report', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(opts.body)
		})
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

describe('Report endpoint behaviour', () => {
	let adminClient: SupabaseClient;

	// author = invitee (participant_a); joiner = inviter (participant_b);
	// outsider = a third user who is NOT in the meeting.
	const AUTHOR = SEED_USERS.other; // marco
	const JOINER = SEED_USERS.digit; // lisa
	const OUTSIDER = TEST_USERS.sophie;

	let authorClient: SupabaseClient;
	let authorServices: Services;
	let joinerClient: SupabaseClient;
	let joinerServices: Services;
	let outsiderClient: SupabaseClient;

	let joinerUser: User;
	let outsiderUser: User;

	let meetingId: string;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanTestData(adminClient);

		authorClient = await createAuthenticatedClient(AUTHOR.email, AUTHOR.password);
		authorServices = createServices(authorClient);
		joinerClient = await createAuthenticatedClient(JOINER.email, JOINER.password);
		joinerServices = createServices(joinerClient);
		outsiderClient = await createAuthenticatedClient(OUTSIDER.email, OUTSIDER.password);

		joinerUser = (await joinerClient.auth.getUser()).data.user!;
		outsiderUser = (await outsiderClient.auth.getUser()).data.user!;

		// Set up one real meeting between author and joiner.
		const prompt = await authorServices.promptCommand.create(AUTHOR.id, {
			title: 'Report endpoint prompt',
			coverImageUrl: 'https://picsum.photos/seed/report/800/400'
		});
		const threeDays = new Date();
		threeDays.setDate(threeDays.getDate() + 3);
		await authorServices.promptCommand.publish(
			prompt.id,
			AUTHOR.id,
			[
				{
					start_time: threeDays.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'report-test',
						name: 'Report Venue',
						address: 'Reportstr 1, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			],
			null,
			2
		);
		const slots = await authorServices.promptQuery.getAvailableSlots(prompt.id, AUTHOR.id);
		const inv = await joinerServices.invitation.create({
			promptId: prompt.id,
			slotId: slots[0].id,
			inviterId: JOINER.id,
			inviteeId: AUTHOR.id
		});
		meetingId = await authorServices.invitation.accept(inv.id);
		expect(meetingId).toBeTruthy();
	});

	it('a participant can file a report — feedback row type=report exists', async () => {
		const res = await POST(
			makeEvent({
				meetingId,
				supabase: joinerClient,
				user: joinerUser,
				body: { description: 'Something felt off about this gathering.' }
			})
		);
		expect(res.status).toBe(200);

		const { data: rows } = await adminClient
			.from('feedback')
			.select('id, type, user_id, context')
			.eq('type', 'report')
			.eq('user_id', JOINER.id);
		const forThisMeeting = (rows ?? []).filter(
			(r) => (r.context as { meeting_id?: string }).meeting_id === meetingId
		);
		expect(forThisMeeting.length).toBeGreaterThanOrEqual(1);
	});

	it('a non-participant is rejected (403) and creates no report row', async () => {
		const res = await POST(
			makeEvent({
				meetingId,
				supabase: outsiderClient,
				user: outsiderUser,
				body: { description: 'I was not at this gathering at all.' }
			})
		);
		expect(res.status).toBe(403);

		const { data: rows } = await adminClient
			.from('feedback')
			.select('id, context')
			.eq('type', 'report')
			.eq('user_id', OUTSIDER.id);
		const forThisMeeting = (rows ?? []).filter(
			(r) => (r.context as { meeting_id?: string }).meeting_id === meetingId
		);
		expect(forThisMeeting).toHaveLength(0);
	});

	it('a description under 10 characters is rejected (400)', async () => {
		const res = await POST(
			makeEvent({
				meetingId,
				supabase: joinerClient,
				user: joinerUser,
				body: { description: 'too short' }
			})
		);
		expect(res.status).toBe(400);
	});

	afterAll(() => cleanTestData(adminClient));
});
