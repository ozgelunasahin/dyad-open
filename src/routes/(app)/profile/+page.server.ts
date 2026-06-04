import type { PageServerLoad } from './$types';
import type { LocationRef } from '$lib/domain/types.js';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';
import { buildUsernameMap } from '$lib/server/username-lookup.js';
import { loadCancellersFor } from '$lib/services/cancellation-query.js';
import { othersBeyond } from '$lib/domain/gathering.js';

function getPartnerId(m: { participant_a: string; participant_b: string }, userId: string): string {
	return m.participant_a === userId ? m.participant_b : m.participant_a;
}

export const load: PageServerLoad = async ({ locals }) => {
	const upactor = requireIdentity(locals);
	const userId = upactor.id;

	const [prompts, meetings, receivedInvitations, respondedPrompts, feedbackDue, cancelledNotifications] = await Promise.all([
		new SupabasePromptQueryService(locals.supabase).getMyPrompts(userId),
		new SupabaseMeetingService(locals.supabase).getMyMeetings(userId),

		// Invitations I received (as prompt author) — pending only
		locals.supabase
			.from('prompt_invitations')
			.select(`
				id, inviter_id, prompt_id, message, state, created_at,
				slot:slot_id(start_time, duration_minutes, general_area),
				prompt:prompt_id(title)
			`)
			.eq('invitee_id', userId)
			.eq('state', 'pending')
			.order('created_at', { ascending: true })
			.then(async ({ data }) => {
				if (!data || data.length === 0) return [];
				const inviterIds = data.map((inv: { inviter_id: string }) => inv.inviter_id);
				const usernameMap = await buildUsernameMap(locals.supabase, inviterIds);
				return data.map((inv: any) => ({
					id: inv.id,
					prompt_id: inv.prompt_id,
					prompt_title: inv.prompt?.title ?? 'Untitled',
					inviter_username: usernameMap.get(inv.inviter_id) ?? 'anonymous',
					message: inv.message,
					slot_start_time: inv.slot?.start_time,
					slot_duration_minutes: inv.slot?.duration_minutes,
					slot_general_area: inv.slot?.general_area,
					created_at: inv.created_at
				}));
			}),

		// Prompts I responded to (with author username)
		locals.supabase
			.from('prompt_comments')
			.select('prompt_id, body, created_at, prompts:prompt_id(title, state, author_id, cover_image_url)')
			.eq('author_id', userId)
			.order('created_at', { ascending: false })
			.then(async ({ data }) => {
				if (!data || data.length === 0) return [];
				const authorIds = data.map((c: any) => c.prompts?.author_id).filter(Boolean);
				const usernameMap = await buildUsernameMap(locals.supabase, authorIds);
				return data.map((c: any) => ({
					prompt_id: c.prompt_id,
					prompt_title: c.prompts?.title ?? 'Untitled',
					prompt_state: c.prompts?.state,
					prompt_cover_image_url: c.prompts?.cover_image_url ?? null,
					author_username: usernameMap.get(c.prompts?.author_id) ?? 'anonymous',
					response_body: c.body,
					created_at: c.created_at
				}));
			}),

		// Feedback forms due
		locals.supabase
			.from('feedback_forms')
			.select('id, meeting_id, state')
			.eq('reviewer_id', userId)
			.eq('state', 'due')
			.then(({ data }) => data ?? []),

		// Cancelled meeting notifications (unread)
		locals.supabase
			.from('notifications')
			.select('id, data, created_at')
			.eq('user_id', userId)
			.eq('type', 'meeting_cancelled')
			.eq('read', false)
			.order('created_at', { ascending: false })
			.then(async ({ data }) => {
				if (!data || data.length === 0) return [];
				const cancellerIds = data.map((n: any) => n.data?.cancelled_by).filter(Boolean);
				const usernameMap = await buildUsernameMap(locals.supabase, cancellerIds);
				return data.map((n: any) => ({
					id: n.id,
					meeting_id: (n.data?.meeting_id as string | undefined) ?? null,
					cancelled_by_username: usernameMap.get(n.data?.cancelled_by) ?? 'someone',
					scheduled_time: n.data?.scheduled_time,
					reason: (n.data?.reason as string | null | undefined) ?? null,
					created_at: n.created_at
				}));
			})
	]);

	// Mark cancelled-meeting notifications as read now that the user has loaded
	// the profile and seen them. The card renders from the loader's snapshot,
	// so it's visible on this view; next reload they'll be gone. The cancellation
	// is still fully visible on the conversation page if the user wants the
	// context back. Fire-and-forget — a transient failure just means the card
	// shows again on the next load, which is harmless.
	if (cancelledNotifications.length > 0) {
		const ids = cancelledNotifications.map((n) => n.id);
		locals.supabase
			.from('notifications')
			.update({ read: true })
			.in('id', ids)
			.then(({ error }) => {
				if (error) console.error('[profile] mark notifications read failed:', error);
			});
	}

	// Resolve meeting partner usernames in one batched call
	const partnerIds = meetings.map((m) => getPartnerId(m, userId));
	const partnerUsernameMap = await buildUsernameMap(locals.supabase, partnerIds);

	// Per-prompt context signals surfaced on profile cards.
	const authoredPromptIds = prompts.map((p) => p.id);
	const respondedPromptIds = respondedPrompts.map((rp) => rp.prompt_id);

	const [responseCountsData, myInvitationsData, authoredSlotsData] = await Promise.all([
		// Response count per authored prompt (for the Started tab).
		authoredPromptIds.length > 0
			? locals.supabase
					.from('prompt_comments')
					.select('prompt_id')
					.in('prompt_id', authoredPromptIds)
					.then(({ data }) => data ?? [])
			: Promise.resolve([]),
		// Invitations I sent out — used to show state on the Responded tab.
		respondedPromptIds.length > 0
			? locals.supabase
					.from('prompt_invitations')
					.select('prompt_id, state, created_at')
					.eq('inviter_id', userId)
					.in('prompt_id', respondedPromptIds)
					.order('created_at', { ascending: false })
					.then(({ data }) => data ?? [])
			: Promise.resolve([]),
		// Slots for authored prompts — drives Started/Past tab segregation.
		// A published prompt with at least one future-valid non-accepted slot
		// is "active" (Started tab); otherwise it's Past (Archive tab).
		authoredPromptIds.length > 0
			? locals.supabase
					.from('time_slots_public')
					.select('prompt_id, start_time, accepted, retired_at')
					.in('prompt_id', authoredPromptIds)
					.then(({ data }) => data ?? [])
			: Promise.resolve([])
	]);

	const responseCountByPromptId: Record<string, number> = {};
	for (const row of responseCountsData as Array<{ prompt_id: string }>) {
		responseCountByPromptId[row.prompt_id] = (responseCountByPromptId[row.prompt_id] ?? 0) + 1;
	}

	// Per-prompt most-recent invitation state I've sent (responded tab).
	const myInvitationStateByPromptId: Record<string, 'pending' | 'accepted' | 'declined' | 'expired'> = {};
	for (const inv of myInvitationsData as Array<{ prompt_id: string; state: string }>) {
		if (!(inv.prompt_id in myInvitationStateByPromptId)) {
			myInvitationStateByPromptId[inv.prompt_id] =
				inv.state as 'pending' | 'accepted' | 'declined' | 'expired';
		}
	}

	// Per-prompt completed-meeting count (archived tab).
	const meetingCountByPromptId: Record<string, number> = {};
	for (const m of meetings) {
		const isCompleted = m.state === 'completed' || m.state === 'awaiting_feedback';
		if (isCompleted) {
			meetingCountByPromptId[m.prompt_id] = (meetingCountByPromptId[m.prompt_id] ?? 0) + 1;
		}
	}

	// Per-prompt active-slot derivation. A prompt is "active" when it has at
	// least one future-valid slot. Drives the Started vs Past (Archive) tab
	// segregation on the profile page — no separate archived state on the
	// prompt itself, just slot validity. Slots that already have accepted
	// meetings still count: a slot can host more than one meeting.
	const now = Date.now();
	const hasFutureValidSlotByPromptId: Record<string, boolean> = {};
	for (const slot of authoredSlotsData as Array<{
		prompt_id: string;
		start_time: string;
		retired_at?: string | null;
	}>) {
		// Withdrawn times (whole-gathering cancel) are not on offer — they must
		// not keep a conversation in the Started tab (mirrors the detail page).
		if (slot.retired_at) continue;
		if (new Date(slot.start_time).getTime() <= now) continue;
		hasFutureValidSlotByPromptId[slot.prompt_id] = true;
	}

	// Canceller lookup for cancelled meetings — shared helper keeps attribution
	// consistent with the conversation page (the partner isn't always the canceller).
	const cancelledMeetingIds = meetings
		.filter((m) => m.state === 'cancelled_early' || m.state === 'cancelled_late')
		.map((m) => m.id);
	const cancellers = await loadCancellersFor(locals.supabase, cancelledMeetingIds);

	// Build prompt_id → meeting map for inline context. The profile card is the
	// same gathering card the conversation page shows, so active meetings also
	// carry exact_location + the anonymised room count (fetched in a parallel
	// pass below — cancelled/past records stay bare).
	// Prefer scheduled/awaiting_feedback meetings over cancelled/completed.
	const meetingsByPromptId: Record<
		string,
		{
			id: string;
			slot_id: string | null;
			scheduled_time: string;
			duration_minutes: number;
			general_area: string | null;
			partner_username: string;
			// All co-participants on the gathering's slot. A group conversation is N
			// two-person meetings sharing one slot, so the author's single profile card
			// must name everyone confirmed — not just the first one. One-on-one
			// conversations yield a single-element array and render exactly as before.
			partner_usernames: string[];
			// Confirmed joiners beyond the identified pins — rendered as neutral
			// circles, mirroring the conversation page's attendee view.
			anonymous_count: number;
			exact_location: LocationRef | null;
			state: string;
			cancelled_by_me: boolean;
			cancelled_by_username: string | null;
		}
	> = {};

	const activeStates = ['scheduled', 'awaiting_feedback'];

	// Sort: active states first, then by most recent scheduled_time
	const sortedMeetings = [...meetings].sort((a, b) => {
		const aActive = activeStates.includes(a.state) ? 0 : 1;
		const bActive = activeStates.includes(b.state) ? 0 : 1;
		if (aActive !== bActive) return aActive - bActive;
		return new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime();
	});

	// `slot_id` is a real `meetings` column (selected via `*` in getMyMeetings) but
	// isn't on the Meeting type — read it through a narrow local accessor.
	const slotIdOf = (m: (typeof meetings)[number]) => (m as { slot_id?: string }).slot_id ?? null;

	// One card per conversation. The representative meeting (first after the sort —
	// active and most recent) defines the card. When it's an active gathering we
	// aggregate every co-participant the viewer can see on that slot. RLS scopes
	// `meetings` to rows the viewer participates in, so the author (a participant in
	// every pair on their own slot) gets the whole group, while a joiner sees only
	// their own pair — no inter-participant identity leak (see DESIGN.md).
	for (const m of sortedMeetings) {
		if (m.prompt_id in meetingsByPromptId) continue;
		const canceller = cancellers.get(m.id) ?? null;
		const repSlot = slotIdOf(m);
		const groupMeetings =
			activeStates.includes(m.state) && repSlot
				? sortedMeetings.filter(
						(x) => x.prompt_id === m.prompt_id && slotIdOf(x) === repSlot && activeStates.includes(x.state)
					)
				: [m];
		const partnerUsernames = [
			...new Set(groupMeetings.map((x) => partnerUsernameMap.get(getPartnerId(x, userId)) ?? 'anonymous'))
		];
		meetingsByPromptId[m.prompt_id] = {
			id: m.id,
			slot_id: repSlot,
			scheduled_time: m.scheduled_time,
			duration_minutes: m.duration_minutes,
			general_area: m.general_area,
			partner_username: partnerUsernames[0] ?? 'anonymous',
			partner_usernames: partnerUsernames,
			anonymous_count: 0,
			exact_location: null,
			state: m.state,
			cancelled_by_me: canceller?.cancelled_by === userId,
			cancelled_by_username: canceller?.cancelled_by_username ?? null
		};
	}

	// Parity pass: the profile card shows the same gathering card as the
	// conversation page, so active representative meetings need exact_location
	// (SECURITY DEFINER RPC — participants only) and the slot's confirmed-joiner
	// count (viewer-safe count-only RPC). One parallel fan-out across the few
	// active cards; cancelled/past records skip it.
	// TODO(perf): 2 RPCs per active meeting (location + occupancy). If profile P99
	// regresses with members holding many active gatherings, replace with a batch
	// RPC taking meeting-id/prompt-id arrays.
	const promptQuery = new SupabasePromptQueryService(locals.supabase);
	const authoredSet = new Set(authoredPromptIds);
	await Promise.all(
		Object.entries(meetingsByPromptId)
			.filter(([, m]) => activeStates.includes(m.state))
			.map(async ([promptId, m]) => {
				const [locationDetail, occupancy] = await Promise.all([
					locals.supabase
						.rpc('get_meeting_with_location', { p_meeting_id: m.id })
						.then(({ data }) => (Array.isArray(data) ? data[0] : data) ?? null),
					m.slot_id
						? promptQuery.getSlotOccupancy(promptId)
						: Promise.resolve({} as Record<string, number>)
				]);
				m.exact_location = locationDetail?.exact_location ?? null;
				const occupied = m.slot_id ? (occupancy[m.slot_id] ?? 0) : 0;
				// The author already sees every joiner identified, so anything beyond
				// the named pins is anonymised; an attendee's identified pins are the
				// host + their own seat — the other joiners stay neutral circles.
				m.anonymous_count = authoredSet.has(promptId)
					? othersBeyond(occupied, m.partner_usernames.length)
					: othersBeyond(occupied, 1);
			})
	);

	return {
		prompts,
		meetingsByPromptId,
		receivedInvitations,
		respondedPrompts,
		feedbackDue,
		cancelledNotifications,
		responseCountByPromptId,
		myInvitationStateByPromptId,
		meetingCountByPromptId,
		hasFutureValidSlotByPromptId,
		attentionCount: receivedInvitations.length + feedbackDue.length + (cancelledNotifications?.length ?? 0)
	};
};
