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

	// Slots the user already has a pending invitation for
	const invitedSlotIds = new Set(myInvitations.map(inv => inv.slot_id));

	return { prompt: detail, comments, myComment, invitedSlotIds: [...invitedSlotIds] };
};
