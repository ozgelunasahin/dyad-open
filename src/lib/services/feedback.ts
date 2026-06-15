import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	FeedbackForm,
	FeedbackFormState,
	RevealedFeedback,
	GroupFeedback,
	GroupFeedbackState
} from '$lib/domain/types.js';

export interface FeedbackInput {
	did_meet: boolean;
	no_show_reason?: string;
	rating_tags?: string[];
	free_text?: string;
	share_with_person?: string;
	share_with_platform?: string;
	platform_comments?: string;
}

export interface GroupFeedbackInput {
	meet_again: boolean;
	comment?: string;
	personal_feedback?: string;
}

export interface FeedbackService {
	getMyForm(meetingId: string, userId: string): Promise<FeedbackForm | null>;
	getFormById(formId: string, userId: string): Promise<FeedbackForm | null>;
	submit(formId: string, data: FeedbackInput): Promise<FeedbackFormState>;
	getRevealedFeedback(meetingId: string, userId: string): Promise<RevealedFeedback[]>;
	getVocabulary(): Promise<string[]>;
	getGroupFormById(formId: string, userId: string): Promise<GroupFeedback | null>;
	submitGroupFeedback(formId: string, data: GroupFeedbackInput): Promise<GroupFeedbackState>;
}

export class SupabaseFeedbackService implements FeedbackService {
	constructor(private supabase: SupabaseClient) {}

	async getMyForm(meetingId: string, userId: string): Promise<FeedbackForm | null> {
		const { data, error } = await this.supabase
			.from('feedback_forms')
			.select('id, meeting_id, reviewer_id, reviewee_id, did_meet, no_show_reason, rating_tags, free_text, share_with_person, state, submitted_at, locked_at, created_at')
			.eq('meeting_id', meetingId)
			.eq('reviewer_id', userId)
			.maybeSingle();

		if (error) throw new Error(`Failed to load feedback form: ${error.message}`);
		return data as FeedbackForm | null;
	}

	async getFormById(formId: string, userId: string): Promise<FeedbackForm | null> {
		const { data, error } = await this.supabase
			.from('feedback_forms')
			.select('id, meeting_id, reviewer_id, reviewee_id, did_meet, no_show_reason, rating_tags, free_text, share_with_person, state, submitted_at, locked_at, created_at')
			.eq('id', formId)
			.eq('reviewer_id', userId)
			.maybeSingle();

		if (error) throw new Error(`Failed to load feedback form: ${error.message}`);
		return data as FeedbackForm | null;
	}

	async submit(formId: string, data: FeedbackInput): Promise<FeedbackFormState> {
		const { data: result, error } = await this.supabase.rpc('submit_feedback', {
			p_form_id: formId,
			p_did_meet: data.did_meet,
			p_no_show_reason: data.no_show_reason ?? null,
			p_rating_tags: data.rating_tags ?? [],
			p_free_text: data.free_text ?? null,
			p_share_with_person: data.share_with_person ?? null,
			p_share_with_platform: data.share_with_platform ?? null,
			p_platform_comments: data.platform_comments ?? null
		});

		if (error) throw new Error(`Failed to submit feedback: ${error.message}`);
		return result as FeedbackFormState;
	}

	async getRevealedFeedback(meetingId: string, userId: string): Promise<RevealedFeedback[]> {
		// RLS: reviewee can only see locked feedback forms
		// We filter to forms where the current user is the reviewee (i.e., feedback about them)
		const { data, error } = await this.supabase
			.from('feedback_forms')
			.select('reviewer_id, did_meet, rating_tags, share_with_person, locked_at')
			.eq('meeting_id', meetingId)
			.eq('reviewee_id', userId)
			.eq('state', 'locked');

		if (error) throw new Error(`Failed to load revealed feedback: ${error.message}`);
		return (data ?? []) as RevealedFeedback[];
	}

	async getVocabulary(): Promise<string[]> {
		const { data, error } = await this.supabase
			.from('adjective_vocabulary')
			.select('word')
			.eq('active', true)
			.order('word');

		if (error) throw new Error(`Failed to load vocabulary: ${error.message}`);
		return (data ?? []).map((d) => d.word);
	}

	// ── Group feedback (R5 / U11) ──────────────────────────────────────────

	async getGroupFormById(formId: string, userId: string): Promise<GroupFeedback | null> {
		const { data, error } = await this.supabase
			.from('group_feedback')
			.select('id, prompt_id, slot_id, reviewer_id, meet_again, comment, personal_feedback, state, submitted_at, created_at')
			.eq('id', formId)
			.eq('reviewer_id', userId)
			.maybeSingle();

		if (error) throw new Error(`Failed to load group feedback form: ${error.message}`);
		return data as GroupFeedback | null;
	}

	async submitGroupFeedback(formId: string, data: GroupFeedbackInput): Promise<GroupFeedbackState> {
		const { data: result, error } = await this.supabase.rpc('submit_group_feedback', {
			p_form_id: formId,
			p_meet_again: data.meet_again,
			p_comment: data.comment ?? null,
			p_personal_feedback: data.personal_feedback ?? null
		});

		if (error) throw new Error(`Failed to submit group feedback: ${error.message}`);
		return result as GroupFeedbackState;
	}
}
