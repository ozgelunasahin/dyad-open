import type { SupabaseClient } from '@supabase/supabase-js';
import type { JSONContent } from '@tiptap/core';
import type { Prompt, PromptDetail, PromptSummary, TimeSlot } from '$lib/domain/types.js';
import { isAvailable } from '$lib/domain/time-slot.js';
import { buildUsernameMap, buildProfileMap } from '$lib/server/username-lookup.js';
import { jsonToPlainText } from '$lib/utils/json-content.js';
import { renderBodyHtmlOrFallback } from '$lib/utils/render-body.js';

const SNIPPET_LENGTH = 200;

export interface PublicProfile {
	username: string;
	display_name: string | null;
	prompts: Array<{
		id: string;
		title: string | null;
		cover_image_url: string | null;
		published_at: string;
	}>;
}

export interface PromptQueryService {
	getPublishedPrompts(params: {
		region: string;
		userId: string;
		limit?: number;
		cursor?: string;
	}): Promise<PromptSummary[]>;

	getPublishedPromptsPublic(params: {
		region?: string;
		limit?: number;
	}): Promise<PromptSummary[]>;

	getPromptDetail(id: string, userId: string): Promise<PromptDetail | null>;

	getMyPrompts(userId: string): Promise<Prompt[]>;

	getAvailableSlots(promptId: string, userId: string): Promise<TimeSlot[]>;

	/** Returns a user's public profile (username, display name) and their
	 *  published conversations. Null when no profile with the given username. */
	getPublicProfile(username: string): Promise<PublicProfile | null>;
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

		// Fetch published prompts (including own — per discover visibility policy).
		// Public-listing methods MUST filter `hidden_at IS NULL`. Detail / own-author
		// methods MUST NOT — direct URL access for invitees, responders, and meeting
		// participants stays open. See migration 20260506130000.
		let query = this.supabase
			.from('prompts')
			.select('id, author_id, title, body, cover_image_url, published_at, region')
			.eq('state', 'published')
			.is('hidden_at', null)
			.eq('region', params.region)
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

		// Build profile map
		const authorIds = prompts.map((p) => p.author_id);
		const profileMap = await buildProfileMap(this.supabase, authorIds);

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
			const profile = profileMap.get(p.author_id);

			summaries.push({
				id: p.id,
				author_id: p.author_id,
				author_username: profile?.username ?? 'anonymous',
				author_display_name: profile?.display_name ?? null,
				title: p.title,
				body_snippet: makeSnippet(p.body as JSONContent | null),
				cover_image_url: p.cover_image_url,
				available_slots: slots,
				soonest_slot: slots[0]?.start_time ?? null,
				published_at: p.published_at,
				region: p.region
			});
		}

		// Stable sort: keep published_at order from DB (no soonest_slot re-sort)
		return summaries;
	}

	async getPublishedPromptsPublic(params: {
		region?: string;
		limit?: number;
	}): Promise<PromptSummary[]> {
		const limit = params.limit ?? 8;

		// Fetch more than needed — some will be filtered out (no available slots)
		let query = this.supabase
			.from('prompts')
			.select('id, author_id, title, body, cover_image_url, published_at, region')
			.eq('state', 'published')
			.is('hidden_at', null)
			.order('published_at', { ascending: false })
			.limit(limit * 3);

		if (params.region) {
			query = query.eq('region', params.region);
		}

		const { data: prompts, error } = await query;
		if (error || !prompts || prompts.length === 0) return [];

		const promptIds = prompts.map((p) => p.id);
		// Public method: no username lookup needed (landing page anonymises them anyway)
		const { data: allSlots } = await this.supabase
			.from('time_slots_public')
			.select('id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at')
			.in('prompt_id', promptIds)
			.eq('accepted', false)
			.order('start_time', { ascending: true });

		const now = new Date();
		const slotsByPrompt = new Map<string, TimeSlot[]>();
		for (const slot of allSlots ?? []) {
			if (isAvailable(slot as TimeSlot, now)) {
				const existing = slotsByPrompt.get(slot.prompt_id) ?? [];
				existing.push(slot as TimeSlot);
				slotsByPrompt.set(slot.prompt_id, existing);
			}
		}

		const summaries: PromptSummary[] = [];
		for (const p of prompts) {
			if (summaries.length >= limit) break;
			const slots = slotsByPrompt.get(p.id) ?? [];
			if (slots.length === 0) continue;

			// Random-length anonymised placeholder (4–8 chars) — real usernames never leave the server
			const anonLength = 4 + Math.floor(Math.random() * 5);
			summaries.push({
				id: p.id,
				author_id: '',
				author_username: '•'.repeat(anonLength),
				author_display_name: null,
				title: p.title,
				body_snippet: makeSnippet(p.body as JSONContent | null),
				cover_image_url: p.cover_image_url,
				available_slots: slots,
				soonest_slot: slots[0]?.start_time ?? null,
				published_at: p.published_at,
				region: p.region
			});
		}

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

		// Defense-in-depth: non-authors only see unaccepted slots.
		// RLS also enforces this at DB layer (20260409_fix_time_slots_rls_safeguarding).
		let slotsQuery = this.supabase
			.from('time_slots_public')
			.select('id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at')
			.eq('prompt_id', id)
			.order('start_time', { ascending: true });

		if (prompt.author_id !== userId) {
			slotsQuery = slotsQuery.eq('accepted', false);
		}

		const { data: slots } = await slotsQuery;

		const now = new Date();
		const availableSlots = (slots ?? []).filter((s) => isAvailable(s as TimeSlot, now)) as TimeSlot[];

		const profileMap = await buildProfileMap(this.supabase, [prompt.author_id]);
		const authorProfile = profileMap.get(prompt.author_id);
		const body = prompt.body as JSONContent | null;

		return {
			id: prompt.id,
			state: prompt.state,
			author_id: prompt.author_id,
			author_username: authorProfile?.username ?? 'anonymous',
			author_display_name: authorProfile?.display_name ?? null,
			title: prompt.title,
			body_snippet: makeSnippet(body),
			body: body ?? { type: 'doc', content: [] },
			body_html: renderBodyHtmlOrFallback(body, prompt.id),
			cover_image_url: prompt.cover_image_url,
			available_slots: availableSlots,
			soonest_slot: availableSlots[0]?.start_time ?? null,
			published_at: prompt.published_at,
			region: prompt.region
		};
	}

	async getSearchCorpus(region: string): Promise<Array<{ id: string; title: string | null; body_text: string; cover_image_url: string | null }>> {
		const { data: prompts } = await this.supabase
			.from('prompts')
			.select('id, title, body, cover_image_url')
			.eq('state', 'published')
			.is('hidden_at', null)
			.eq('region', region)
			.order('published_at', { ascending: false })
			.limit(200);

		return (prompts ?? []).map((p) => ({
			id: p.id,
			title: p.title,
			body_text: p.body ? jsonToPlainText(p.body as JSONContent).trim() : '',
			cover_image_url: p.cover_image_url
		}));
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

	async getPublicProfile(username: string): Promise<PublicProfile | null> {
		const { data: profile } = await this.supabase
			.from('profiles')
			.select('id, username, display_name')
			.eq('username', username)
			.maybeSingle();

		if (!profile) return null;

		const { data: prompts } = await this.supabase
			.from('prompts')
			.select('id, title, cover_image_url, published_at')
			.eq('author_id', profile.id)
			.eq('state', 'published')
			.is('hidden_at', null)
			.order('published_at', { ascending: false });

		return {
			username: profile.username,
			display_name: profile.display_name ?? null,
			prompts: (prompts ?? []) as PublicProfile['prompts']
		};
	}
}

function makeSnippet(body: JSONContent | null): string {
	if (!body) return '';
	const text = jsonToPlainText(body).trim();
	if (text.length <= SNIPPET_LENGTH) return text;
	return text.slice(0, SNIPPET_LENGTH).trimEnd() + '…';
}
