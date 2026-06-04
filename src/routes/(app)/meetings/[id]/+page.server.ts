import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { SupabaseMeetingService } from '$lib/services/meeting.js';
import { SupabaseFeedbackService } from '$lib/services/feedback.js';
import type { RevealedFeedback, FeedbackForm } from '$lib/domain/types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const upactor = requireIdentity(locals);
	const userId = upactor.id;
	const meetingService = new SupabaseMeetingService(locals.supabase);

	const meeting = await meetingService.getWithLocation(params.id)
		?? await meetingService.getDetail(params.id);

	if (!meeting) {
		redirect(302, '/profile');
	}

	if (meeting.participant_a !== userId && meeting.participant_b !== userId) {
		redirect(302, '/profile');
	}

	// `otherId` is the partner on THIS meeting row (the pair that cancel/feedback/the
	// calendar invite act on). For a group conversation the gathering has more people
	// — `coParticipants` below collects them for display.
	const otherId = meeting.participant_a === userId
		? meeting.participant_b
		: meeting.participant_a;

	const feedbackService = new SupabaseFeedbackService(locals.supabase);

	// Fan out all secondary queries in parallel
	const [{ data: otherProfile }, { data: prompt }, invitation, revealedFeedback, myFeedbackForm, coParticipants] = await Promise.all([
		locals.supabase.from('profiles').select('username').eq('id', otherId).single(),
		locals.supabase.from('prompts').select('id, title, cover_image_url, state, author_id, published_at').eq('id', meeting.prompt_id).single(),
		// The invitation that created THIS specific meeting. Meeting.invitation_id
		// is the direct FK — previously this fetched any accepted invitation on
		// the prompt, which after cancel + re-invite surfaced the stale
		// original-invite's note instead of the new one.
		meeting.invitation_id
			? locals.supabase
					.from('prompt_invitations')
					.select('message')
					.eq('id', meeting.invitation_id)
					.maybeSingle()
					.then(r => r.data ?? null)
			: Promise.resolve(null),
		// Load revealed feedback for completed meetings
		meeting.state === 'completed'
			? feedbackService.getRevealedFeedback(params.id, userId)
			: [] as RevealedFeedback[],
		// Load own feedback form state for awaiting_feedback meetings
		(meeting.state === 'awaiting_feedback' || meeting.state === 'completed')
			? feedbackService.getMyForm(params.id, userId)
			: null as FeedbackForm | null,
		// Co-participants on this meeting's slot — the gathering. A group conversation
		// is N two-person meetings sharing one slot; the people present are the other
		// participants across those rows. RLS scopes `meetings` to rows the viewer is
		// in, so the conversation author (a participant in every pair on their own
		// slot) gets the whole group, while a joiner sees only their own pair — which
		// keeps the deferred inter-participant reveal closed (see DESIGN.md). Returns
		// the resolved usernames; empty when the slot can't be read (we fall back to
		// the single partner below).
		(async (): Promise<string[]> => {
			const { data: thisRow } = await locals.supabase
				.from('meetings')
				.select('slot_id')
				.eq('id', params.id)
				.maybeSingle();
			if (!thisRow?.slot_id) return [];
			const { data: siblings } = await locals.supabase
				.from('meetings')
				.select('participant_a, participant_b')
				.eq('slot_id', thisRow.slot_id)
				.in('state', ['scheduled', 'awaiting_feedback', 'completed']);
			const ids = new Set<string>();
			for (const s of siblings ?? []) {
				if (s.participant_a !== userId) ids.add(s.participant_a);
				if (s.participant_b !== userId) ids.add(s.participant_b);
			}
			if (ids.size === 0) return [];
			const { data: profs } = await locals.supabase
				.from('profiles')
				.select('id, username')
				.in('id', [...ids]);
			const nameById = new Map((profs ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));
			return [...ids].map((id) => nameById.get(id) ?? 'someone');
		})()
	]);

	return {
		meeting,
		otherUsername: otherProfile?.username ?? 'someone',
		// The gathering's participants (author sees the group; a joiner sees just the
		// author). Falls back to the single partner for ordinary two-person meetings.
		coParticipants: coParticipants.length > 0 ? coParticipants : [otherProfile?.username ?? 'someone'],
		prompt: prompt ? {
			id: prompt.id,
			title: prompt.title,
			cover_image_url: prompt.cover_image_url,
			state: prompt.state,
			published_at: prompt.published_at
		} : null,
		invitationMessage: invitation?.message ?? null,
		revealedFeedback,
		myFeedbackForm: myFeedbackForm ? { id: myFeedbackForm.id, state: myFeedbackForm.state } : null
	};
};
