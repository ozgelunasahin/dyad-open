import type { JSONContent } from '@tiptap/core';

// Prompt states
export type PromptState = 'draft' | 'published' | 'archived';

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
	archived_at: string | null;
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
	// exact_location intentionally omitted from public type
}

export interface TimeSlotWithLocation extends TimeSlot {
	exact_location: LocationRef;
}

export interface TimeSlotInput {
	start_time: string; // ISO 8601
	duration_minutes: number;
	location: LocationRef;
}

// Discover feed types

export interface PromptSummary {
	id: string;
	author_id: string;
	author_username: string;
	title: string | null;
	body_snippet: string;
	cover_image_url: string | null;
	available_slots: TimeSlot[];
	soonest_slot: string | null; // ISO 8601 of earliest available slot
	published_at: string;
	region: string;
}

export interface PromptDetail extends PromptSummary {
	body: JSONContent;
	body_html: string; // server-rendered TipTap HTML (sanitized)
}
