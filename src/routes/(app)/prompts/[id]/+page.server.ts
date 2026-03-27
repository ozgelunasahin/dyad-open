import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseCommentService } from '$lib/services/comment.js';
import { SupabaseInvitationService } from '$lib/services/invitation.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
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

	// For the author: load enriched invitation data (inviter username, comment text, slot details)
	let receivedInvitations: Array<{
		id: string;
		inviter_username: string;
		message: string | null;
		comment_body: string | null;
		slot_start_time: string;
		slot_duration_minutes: number;
		slot_general_area: string;
		created_at: string;
	}> = [];

	if (isAuthor && myInvitations.length > 0) {
		// Query invitations with comment and slot joins (FK-based)
		const { data: enriched } = await locals.supabase
			.from('prompt_invitations')
			.select(`
				id,
				inviter_id,
				message,
				created_at,
				comment:comment_id(body),
				slot:slot_id(start_time, duration_minutes, general_area)
			`)
			.eq('prompt_id', params.id)
			.eq('state', 'pending')
			.order('created_at', { ascending: true });

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

	return {
		prompt: detail,
		comments: enrichedComments,
		myComment,
		invitedSlotIds: [...invitedSlotIds],
		receivedInvitations,
		user: { id: userId }
	};
};
