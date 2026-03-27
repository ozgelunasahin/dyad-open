import type { SupabaseClient } from '@supabase/supabase-js';
import type { Comment } from '$lib/domain/types.js';

export interface CommentService {
	createOrUpdate(promptId: string, authorId: string, body: string): Promise<Comment>;
	getCommentsForPrompt(promptId: string): Promise<Comment[]>;
	getMyComment(promptId: string, userId: string): Promise<Comment | null>;
}

export class SupabaseCommentService implements CommentService {
	constructor(private supabase: SupabaseClient) {}

	async createOrUpdate(promptId: string, authorId: string, body: string): Promise<Comment> {
		// Verify commenter is not the prompt author
		const { data: prompt } = await this.supabase
			.from('prompts')
			.select('author_id')
			.eq('id', promptId)
			.single();

		if (!prompt) throw new Error('Prompt not found');
		if (prompt.author_id === authorId) throw new Error('Cannot comment on your own prompt');

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

	async getCommentsForPrompt(promptId: string): Promise<Comment[]> {
		// RLS handles visibility: prompt author sees all, others see only their own
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
