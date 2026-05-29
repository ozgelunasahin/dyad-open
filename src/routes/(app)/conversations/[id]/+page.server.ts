import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseCommentService } from '$lib/services/comment.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';
import { loadCancellersFor } from '$lib/services/cancellation-query.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);
	const userId = upactor.id;
	const promptService = new SupabasePromptQueryService(locals.supabase);
	const commentService = new SupabaseCommentService(locals.supabase);
	const invitationService = new SupabaseInvitationService(locals.supabase);

	const [detail, comments, myComment, myInvitations] = await Promise.all([
		promptService.getPromptDetail(params.id, userId),
		commentService.getCommentsForPrompt(params.id),
		commentService.getMyComment(params.id, userId),
		invitationService.getPendingForPrompt(params.id, userId)
	]);

	if (!detail) {
		redirect(302, '/discover');
	}

	const isAuthor = detail.author_id === userId;

	// Slots the current user already has a pending invitation for
	const invitedSlotIds = new Set(myInvitations.map(inv => inv.slot_id));
	// slot_id → invitation_id map so the responder can withdraw their own
	// pending invitation from the conversation page without another lookup.
	const myInvitationBySlotId: Record<string, string> = {};
	for (const inv of myInvitations) myInvitationBySlotId[inv.slot_id] = inv.id;

	// For the author: load enriched invitation data (inviter username, comment text, slot details)
	let receivedInvitations: Array<{
		id: string;
		inviter_id: string;
		slot_id: string;
		state: string;
		inviter_username: string;
		message: string | null;
		comment_body: string | null;
		slot_start_time: string;
		slot_duration_minutes: number;
		slot_general_area: string;
		created_at: string;
	}> = [];

	if (isAuthor) {
		// Query all invitations (pending + accepted) with comment and slot joins
		const { data: enriched } = await locals.supabase
			.from('prompt_invitations')
			.select(`
				id,
				inviter_id,
				slot_id,
				message,
				state,
				created_at,
				comment:comment_id(body),
				slot:slot_id(start_time, duration_minutes, general_area)
			`)
			.eq('prompt_id', params.id)
			.in('state', ['pending', 'accepted'])
			// Most recent first — the author view picks the first match per inviter,
			// so newer re-invitations must take precedence over older (possibly
			// cancelled) ones.
			.order('created_at', { ascending: false });

		if (enriched) {
			// Separate lookup for inviter usernames (no FK from inviter_id to profiles)
			const inviterIds = [...new Set(enriched.map((inv: any) => inv.inviter_id))];
			const { data: inviterProfiles } = await locals.supabase
				.from('profiles')
				.select('id, username')
				.in('id', inviterIds);
			const inviterMap = new Map((inviterProfiles ?? []).map((p: any) => [p.id, p.username]));

			receivedInvitations = enriched.map((inv: any) => ({
				id: inv.id,
				inviter_id: inv.inviter_id,
				slot_id: inv.slot_id,
				state: inv.state,
				inviter_username: inviterMap.get(inv.inviter_id) ?? 'anonymous',
				message: inv.message,
				comment_body: inv.comment?.body ?? null,
				slot_start_time: inv.slot?.start_time,
				slot_duration_minutes: inv.slot?.duration_minutes,
				slot_general_area: inv.slot?.general_area,
				created_at: inv.created_at
			}));
		}
	}

	// Enrich comments with author usernames (for author view)
	let enrichedComments = comments;
	if (isAuthor && comments.length > 0) {
		const authorIds = [...new Set(comments.map(c => c.author_id))];
		const { data: profiles } = await locals.supabase
			.from('profiles')
			.select('id, username')
			.in('id', authorIds);

		const usernameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));
		enrichedComments = comments.map(c => ({
			...c,
			author_username: usernameMap.get(c.author_id) ?? 'anonymous'
		}));
	}

	// Load meetings for this prompt (to link accepted invitations to meetings)
	// Author can see exact_location for their own prompt's meetings
	const promptMeetings: Array<{
		id: string;
		slot_id: string;
		scheduled_time: string;
		duration_minutes: number;
		state: string;
		resolved_at: string | null;
		exact_location: { place_id: string; name: string; address: string; lat: number; lng: number } | null;
		general_area: string | null;
		cancelled_by: string | null;
		cancelled_by_username: string | null;
		cancellation_reason: string | null;
		// Inviter username from meetings.participant_b. The author is participant_a;
		// participant_b is the responder who initiated the invitation. Enriched
		// directly from profiles rather than walking the invitation chain so a
		// cancelled-then-replaced invitation can't break the lookup.
		partner_username: string | null;
	}> = [];
	if (isAuthor) {
		const { data: meetings } = await locals.supabase
			.from('meetings')
			.select('id, slot_id, scheduled_time, duration_minutes, state, resolved_at, participant_b')
			.eq('prompt_id', params.id)
			// Active (unresolved) meetings first, then most-recently-resolved.
			// When a slot has both a cancelled meeting and a fresh scheduled one
			// from a re-invite, .find(m => m.slot_id === inv.slot_id) must hit
			// the active one — otherwise the author sees stale cancelled state.
			.order('resolved_at', { ascending: false, nullsFirst: true });

		// Fetch canceller info (id + username) for cancelled meetings in one shared query.
		const cancelledMeetingIds = (meetings ?? [])
			.filter((m) => m.state === 'cancelled_early' || m.state === 'cancelled_late')
			.map((m) => m.id);
		const cancellers = await loadCancellersFor(locals.supabase, cancelledMeetingIds);

		// Resolve partner_username for each meeting in one shared profiles query.
		const partnerIds = [...new Set((meetings ?? []).map((m) => m.participant_b))];
		const partnerMap = new Map<string, string>();
		if (partnerIds.length > 0) {
			const { data: partnerProfiles } = await locals.supabase
				.from('profiles')
				.select('id, username')
				.in('id', partnerIds);
			for (const p of partnerProfiles ?? []) {
				partnerMap.set(p.id, p.username);
			}
		}

		// Enrich with exact_location via SECURITY DEFINER RPC
		for (const m of meetings ?? []) {
			const { data: detail } = await locals.supabase.rpc('get_meeting_with_location', { p_meeting_id: m.id });
			const d = Array.isArray(detail) ? detail[0] : detail;
			const canceller = cancellers.get(m.id) ?? null;
			promptMeetings.push({
				id: m.id,
				slot_id: m.slot_id,
				scheduled_time: m.scheduled_time,
				duration_minutes: m.duration_minutes,
				state: m.state,
				resolved_at: m.resolved_at ?? null,
				exact_location: d?.exact_location ?? null,
				general_area: d?.general_area ?? null,
				cancelled_by: canceller?.cancelled_by ?? null,
				cancelled_by_username: canceller?.cancelled_by_username ?? null,
				cancellation_reason: canceller?.reason ?? null,
				partner_username: partnerMap.get(m.participant_b) ?? null
			});
		}
	}

	// For non-authors: check if they have a confirmed meeting for this prompt
	let myMeeting: {
		id: string;
		scheduled_time: string;
		duration_minutes: number;
		general_area: string;
		exact_location: { place_id: string; name: string; address: string; lat: number; lng: number } | null;
	} | null = null;

	// Most recent cancellation involving the responder on this prompt — used to surface
	// the canceller's note and a "re-invite" nudge when there's no active meeting.
	let myCancellation: {
		cancelled_by: string;
		cancelled_by_username: string | null;
		reason: string | null;
		cancelled_at: string;
	} | null = null;

	if (!isAuthor) {
		// Step 1: find the meeting ID (RLS restricts to participant rows)
		const { data: meetingRow } = await locals.supabase
			.from('meetings')
			.select('id')
			.eq('prompt_id', params.id)
			.or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
			.in('state', ['scheduled', 'awaiting_feedback', 'completed'])
			.maybeSingle();

		// Step 2: use the SECURITY DEFINER RPC to safely retrieve exact_location
		if (meetingRow) {
			const { data: meetingDetail } = await locals.supabase.rpc('get_meeting_with_location', {
				p_meeting_id: meetingRow.id
			});
			const meetingData = Array.isArray(meetingDetail) ? meetingDetail[0] : meetingDetail;
			if (meetingData) {
				myMeeting = {
					id: meetingData.id,
					scheduled_time: meetingData.scheduled_time,
					duration_minutes: meetingData.duration_minutes,
					general_area: meetingData.general_area ?? '',
					exact_location: meetingData.exact_location ?? null
				};
			}
		} else {
			// No active meeting — look for a recent cancelled one on this prompt.
			const { data: cancelledRows } = await locals.supabase
				.from('meetings')
				.select('id')
				.eq('prompt_id', params.id)
				.or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
				.in('state', ['cancelled_early', 'cancelled_late'])
				.order('resolved_at', { ascending: false })
				.limit(1);
			const cancelledMeetingId = cancelledRows?.[0]?.id;
			if (cancelledMeetingId) {
				const { data: record } = await locals.supabase
					.from('cancellation_records')
					.select('cancelled_by, reason, cancelled_at, id')
					.eq('meeting_id', cancelledMeetingId)
					// Tie-breaker on id keeps selection stable when two records
					// share an exact cancelled_at timestamp.
					.order('cancelled_at', { ascending: false })
					.order('id', { ascending: false })
					.limit(1)
					.maybeSingle();
				if (record) {
					const { data: cProfile } = await locals.supabase
						.from('profiles')
						.select('username')
						.eq('id', record.cancelled_by)
						.maybeSingle();
					myCancellation = {
						cancelled_by: record.cancelled_by,
						cancelled_by_username: cProfile?.username ?? null,
						reason: record.reason,
						cancelled_at: record.cancelled_at
					};
				}
			}
		}
	}

	// Participants: everyone who has responded to this conversation, shown as
	// a stacked-avatars section. We surface first names only — not usernames,
	// not full profiles. The author is excluded (they wrote the prompt, not a
	// participant in the respondent sense). Current user is excluded too so
	// they don't see themselves listed.
	const participantAuthorIds = [
		...new Set(comments.map((c) => c.author_id).filter((id) => id !== userId && id !== detail.author_id))
	];

	let participants: Array<{ id: string; firstName: string }> = [];
	if (participantAuthorIds.length > 0) {
		const { data: participantProfiles } = await locals.supabase
			.from('profiles')
			.select('id, username, display_name')
			.in('id', participantAuthorIds);

		participants = (participantProfiles ?? []).map((p: { id: string; username: string; display_name: string | null }) => ({
			id: p.id,
			firstName: p.display_name ? p.display_name.trim().split(/\s+/)[0] : p.username,
		}));
	}

	return {
		prompt: detail,
		comments: enrichedComments,
		myComment,
		invitedSlotIds: [...invitedSlotIds],
		myInvitationBySlotId,
		receivedInvitations,
		promptMeetings,
		myMeeting,
		myCancellation,
		participants,
		user: { id: userId }
	};
};
