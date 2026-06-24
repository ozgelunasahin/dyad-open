import type { SupabaseClient } from '@supabase/supabase-js';
import type { Comment } from '$lib/domain/types.js';
import { DomainError } from '$lib/domain/errors.js';

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

		if (!prompt) throw new DomainError('Conversation not found', 404);
		if (prompt.author_id === authorId) throw new DomainError('Cannot respond to your own conversation');

		// Editing an existing response is a pure UPDATE (the ungated FOR UPDATE
		// policy); only a NEW response is an INSERT (the gated FOR INSERT WITH
		// CHECK). An upsert won't do: Postgres evaluates the INSERT WITH CHECK on
		// the proposed row even when ON CONFLICT resolves to UPDATE, which would
		// gate edits too. So split the path explicitly to keep edits ungated.
		const { data: existing } = await this.supabase
			.from('prompt_comments')
			.select('id')
			.eq('prompt_id', promptId)
			.eq('author_id', authorId)
			.maybeSingle();

		if (existing) {
			const { data, error } = await this.supabase
				.from('prompt_comments')
				.update({ body })
				.eq('prompt_id', promptId)
				.eq('author_id', authorId)
				.select()
				.single();
			if (error) throw new Error(`Failed to save comment: ${error.message}`);
			return data as Comment;
		}

		const { data, error } = await this.supabase
			.from('prompt_comments')
			.insert({ prompt_id: promptId, author_id: authorId, body })
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
