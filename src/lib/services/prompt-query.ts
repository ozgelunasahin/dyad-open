import type { SupabaseClient } from '@supabase/supabase-js';
import type { JSONContent } from '@tiptap/core';
import type { Prompt, PromptDetail, PromptSummary, TimeSlot } from '$lib/domain/types.js';
import { isAvailable } from '$lib/domain/time-slot.js';
import { buildUsernameMap } from '$lib/server/username-lookup.js';
import { jsonToPlainText } from '$lib/utils/json-content.js';
import { renderTiptapToHtml } from '$lib/utils/tiptap-html.js';

const SNIPPET_LENGTH = 200;

export interface PromptQueryService {
	getPublishedPrompts(params: {
		region: string;
		userId: string;
		limit?: number;
		cursor?: string;
	}): Promise<PromptSummary[]>;

	getPromptDetail(id: string, userId: string): Promise<PromptDetail | null>;

	getMyPrompts(userId: string): Promise<Prompt[]>;

	getAvailableSlots(promptId: string, userId: string): Promise<TimeSlot[]>;
}

export class SupabasePromptQueryService implements PromptQueryService {
	constructor(private supabase: SupabaseClient) {}

	async getPublishedPrompts(params: {
		region: string;
		userId: string;
		limit?: number;
		cursor?: string;
	}): Promise<PromptSummary[]> {
		const limit = params.limit ?? 20;

		// Fetch published prompts excluding the user's own
		let query = this.supabase
			.from('prompts')
			.select('id, author_id, title, body, cover_image_url, published_at, region')
			.eq('state', 'published')
			.eq('region', params.region)
			.neq('author_id', params.userId)
			.order('published_at', { ascending: false })
			.limit(limit);

		if (params.cursor) {
			query = query.lt('published_at', params.cursor);
		}

		const { data: prompts, error } = await query;
		if (error || !prompts) return [];

		if (prompts.length === 0) return [];

		// Fetch slots for all returned prompts
		const promptIds = prompts.map((p) => p.id);
		const { data: allSlots } = await this.supabase
			.from('time_slots_public')
			.select('id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at')
			.in('prompt_id', promptIds)
			.eq('accepted', false)
			.order('start_time', { ascending: true });

		// Build username map
		const authorIds = prompts.map((p) => p.author_id);
		const usernameMap = await buildUsernameMap(this.supabase, authorIds);

		// Filter to only available slots and group by prompt
		const now = new Date();
		const slotsByPrompt = new Map<string, TimeSlot[]>();
		for (const slot of allSlots ?? []) {
			if (isAvailable(slot as TimeSlot, now)) {
				const existing = slotsByPrompt.get(slot.prompt_id) ?? [];
				existing.push(slot as TimeSlot);
				slotsByPrompt.set(slot.prompt_id, existing);
			}
		}

		// Build summaries, filtering out prompts with no available slots
		const summaries: PromptSummary[] = [];
		for (const p of prompts) {
			const slots = slotsByPrompt.get(p.id) ?? [];
			if (slots.length === 0) continue;

			summaries.push({
				id: p.id,
				author_id: p.author_id,
				author_username: usernameMap.get(p.author_id) ?? 'anonymous',
				title: p.title,
				body_snippet: makeSnippet(p.body as JSONContent | null),
				cover_image_url: p.cover_image_url,
				available_slots: slots,
				soonest_slot: slots[0]?.start_time ?? null,
				published_at: p.published_at,
				region: p.region
			});
		}

		// Sort by soonest slot
		summaries.sort((a, b) => {
			if (!a.soonest_slot) return 1;
			if (!b.soonest_slot) return -1;
			return a.soonest_slot.localeCompare(b.soonest_slot);
		});

		return summaries;
	}

	async getPromptDetail(id: string, userId: string): Promise<PromptDetail | null> {
		const { data: prompt, error } = await this.supabase
			.from('prompts')
			.select('*')
			.eq('id', id)
			.single();

		if (error || !prompt) return null;

		// Only return published prompts to non-authors
		if (prompt.state !== 'published' && prompt.author_id !== userId) {
			return null;
		}

		const { data: slots } = await this.supabase
			.from('time_slots_public')
			.select('id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at')
			.eq('prompt_id', id)
			.order('start_time', { ascending: true });

		const now = new Date();
		const availableSlots = (slots ?? []).filter((s) => isAvailable(s as TimeSlot, now)) as TimeSlot[];

		const usernameMap = await buildUsernameMap(this.supabase, [prompt.author_id]);
		const body = prompt.body as JSONContent | null;

		return {
			id: prompt.id,
			author_id: prompt.author_id,
			author_username: usernameMap.get(prompt.author_id) ?? 'anonymous',
			title: prompt.title,
			body_snippet: makeSnippet(body),
			body: body ?? { type: 'doc', content: [] },
			body_html: renderTiptapToHtml(body),
			cover_image_url: prompt.cover_image_url,
			available_slots: availableSlots,
			soonest_slot: availableSlots[0]?.start_time ?? null,
			published_at: prompt.published_at,
			region: prompt.region
		};
	}

	async getMyPrompts(userId: string): Promise<Prompt[]> {
		const { data, error } = await this.supabase
			.from('prompts')
			.select('*')
			.eq('author_id', userId)
			.order('updated_at', { ascending: false });

		if (error) return [];
		return (data ?? []) as Prompt[];
	}

	async getAvailableSlots(promptId: string, userId: string): Promise<TimeSlot[]> {
		// Fetch all non-accepted slots
		const { data: slots } = await this.supabase
			.from('time_slots_public')
			.select('id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at')
			.eq('prompt_id', promptId)
			.eq('accepted', false)
			.order('start_time', { ascending: true });

		const now = new Date();
		return ((slots ?? []) as TimeSlot[]).filter((s) => isAvailable(s, now));
	}
}

function makeSnippet(body: JSONContent | null): string {
	if (!body) return '';
	const text = jsonToPlainText(body).trim();
	if (text.length <= SNIPPET_LENGTH) return text;
	return text.slice(0, SNIPPET_LENGTH).trimEnd() + '…';
}
