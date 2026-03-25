import type { SupabaseClient } from '@supabase/supabase-js';
import type { Comment } from '$lib/domain/types.js';

export interface CommentService {
	createOrUpdate(promptId: string, authorId: string, body: string): Promise<Comment>;
	getForPromptAuthor(promptId: string, promptAuthorId: string): Promise<Comment[]>;
	getMyComment(promptId: string, userId: string): Promise<Comment | null>;
}

export class SupabaseCommentService implements CommentService {
	constructor(private supabase: SupabaseClient) {}

	async createOrUpdate(promptId: string, authorId: string, body: string): Promise<Comment> {
		const { data, error } = await this.supabase
			.from('prompt_comments')
			.upsert(
				{ prompt_id: promptId, author_id: authorId, body },
				{ onConflict: 'prompt_id,author_id' }
			)
			.select()
			.single();

		if (error) throw new Error(`Failed to save comment: ${error.message}`);
		return data as Comment;
	}

	async getForPromptAuthor(promptId: string, promptAuthorId: string): Promise<Comment[]> {
		// RLS ensures only the prompt author sees all comments
		// Other users would only see their own via the "Authors manage own comments" policy
		const { data, error } = await this.supabase
			.from('prompt_comments')
			.select('*')
			.eq('prompt_id', promptId)
			.order('created_at', { ascending: true });

		if (error) throw new Error(`Failed to load comments: ${error.message}`);
		return (data ?? []) as Comment[];
	}

	async getMyComment(promptId: string, userId: string): Promise<Comment | null> {
		const { data, error } = await this.supabase
			.from('prompt_comments')
			.select('*')
			.eq('prompt_id', promptId)
			.eq('author_id', userId)
			.maybeSingle();

		if (error) throw new Error(`Failed to load comment: ${error.message}`);
		return data as Comment | null;
	}
}
