import type { JSONContent } from '@tiptap/core';

// Prompt states
export type PromptState = 'draft' | 'published';

// Location reference stored in time_slots.exact_location JSONB
export interface LocationRef {
	place_id: string;
	name: string;
	address: string;
	lat: number;
	lng: number;
}

// Core entities

export interface Prompt {
	id: string;
	author_id: string;
	title: string | null;
	body: JSONContent | null;
	cover_image_url: string | null;
	state: PromptState;
	region: string;
	published_at: string | null;
	hidden_at: string | null;
	audience_scope: string | null;
	// Max joiners per slot. null = legacy unlimited; 1 = one-on-one; 2-7 = group
	// (up to 8 total incl. author). Set at first publish, immutable thereafter.
	capacity: number | null;
	created_at: string;
	updated_at: string;
}

export interface TimeSlot {
	id: string;
	prompt_id: string;
	start_time: string;
	duration_minutes: number;
	general_area: string;
	general_area_lat: number | null;
	general_area_lng: number | null;
	accepted: boolean;
	created_at: string;
	// exact_location is omitted from non-author surfaces (public view masks it).
	// Present (or null) only when the loader fetched via get_my_prompt_slots
	// (author path); the RPC returns full time_slots rows where the column
	// can be null.
	exact_location?: LocationRef | null;
}

export interface TimeSlotWithLocation extends TimeSlot {
	exact_location: LocationRef;
}

export interface TimeSlotInput {
	start_time: string; // ISO 8601
	duration_minutes: number;
	location: LocationRef;
}

// Slot submitted from the publish sheet back to the editor for diff
// computation. dbId is set when the draft was hydrated from an existing
// time_slots row; absent when the draft is freshly added in the sheet.
export type SubmitSlot = TimeSlotInput & { dbId?: string };

// Discover feed types

export interface PromptSummary {
	id: string;
	author_id: string;
	author_username: string;
	author_display_name: string | null;
	title: string | null;
	body_snippet: string;
	cover_image_url: string | null;
	available_slots: TimeSlot[];
	soonest_slot: string | null; // ISO 8601 of earliest available slot
	published_at: string;
	region: string;
	audience_scope: string | null;
	audience_scope_name: string | null;
	// Max joiners per slot (mirrors Prompt.capacity). null = legacy unlimited;
	// 1 = one-on-one; 2-7 = small group (up to 8 total incl. author). Optional
	// because not every summary surface populates it (anon landing teaser leaves
	// it undefined); detail and the authenticated feed always set it.
	capacity?: number | null;
}

export interface PromptDetail extends PromptSummary {
	state: PromptState;
	body: JSONContent;
	body_html: string; // server-rendered TipTap HTML (sanitized)
}

// Engagement types

export type InvitationState = 'pending' | 'accepted' | 'cancelled' | 'expired';

export interface Comment {
	id: string;
	prompt_id: string;
	author_id: string;
	author_username?: string;
	body: string;
	created_at: string;
	updated_at: string;
	// "edited" derived in UI: updated_at > created_at
}

export interface MeetingInvitation {
	id: string;
	prompt_id: string;
	slot_id: string;
	inviter_id: string;
	invitee_id: string;
	comment_id: string | null;
	message: string | null;
	state: InvitationState;
	created_at: string;
	resolved_at: string | null;
}

// Meeting types

export type MeetingState =
	| 'scheduled'
	| 'cancelled_early'
	| 'cancelled_late'
	| 'awaiting_feedback'
	| 'completed';

export type CancellationTier = 'early' | 'late';

export interface Meeting {
	id: string;
	invitation_id: string;
	prompt_id: string;
	participant_a: string;
	participant_b: string;
	scheduled_time: string;
	duration_minutes: number;
	state: MeetingState;
	created_at: string;
	resolved_at: string | null;
}

export interface MeetingWithLocation extends Meeting {
	exact_location: LocationRef;
	general_area: string;
}

export interface MeetingDetail extends Meeting {
	general_area: string;
	cancellation_tier: CancellationTier | null;
	cancellation_reason: string | null;
	cancelled_by: string | null;
}

export interface CancellationRecord {
	id: string;
	meeting_id: string;
	cancelled_by: string;
	cancelled_at: string;
	tier: CancellationTier;
	reason: string | null;
	free_pass_used: boolean;
}

// Feedback types

export type FeedbackFormState = 'not_due' | 'due' | 'submitted' | 'locked' | 'released';

export interface FeedbackForm {
	id: string;
	meeting_id: string;
	reviewer_id: string;
	reviewee_id: string;
	did_meet: boolean | null;
	no_show_reason: string | null;
	rating_tags: string[];
	free_text: string | null;
	share_with_person: string | null;
	// share_with_platform and platform_comments hidden by column-level REVOKE
	state: FeedbackFormState;
	submitted_at: string | null;
	locked_at: string | null;
	created_at: string;
}

export interface RevealedFeedback {
	reviewer_id: string;
	did_meet: boolean;
	rating_tags: string[];
	share_with_person: string | null;
	locked_at: string;
}

export interface GateStatus {
	gated: boolean;
	feedbackFormId: string | null;
}

export interface ReputationSignal {
	id: string;
	profile_id: string;
	signal_type: 'feedback_received' | 'cancellation' | 'no_show';
	source_meeting_id: string;
	visible: boolean;
	content: Record<string, unknown>;
	created_at: string;
}
