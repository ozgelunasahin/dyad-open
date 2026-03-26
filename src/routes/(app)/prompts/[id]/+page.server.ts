import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { SupabaseCommentService } from '$lib/services/comment.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = locals.user!.id;
	const promptService = new SupabasePromptQueryService(locals.supabase);
	const commentService = new SupabaseCommentService(locals.supabase);

	const [detail, comments, myComment] = await Promise.all([
		promptService.getPromptDetail(params.id, userId),
		commentService.getCommentsForPrompt(params.id),
		commentService.getMyComment(params.id, userId)
	]);

	if (!detail) {
		redirect(302, '/discover');
	}

	return { prompt: detail, comments, myComment };
};
