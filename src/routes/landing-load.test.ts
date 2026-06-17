import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PromptSummary, TimeSlot } from '$lib/domain/types.js';

// Mock the query service the loader instantiates. We only need to control what
// getPublishedPromptsPublic returns; the loader's own geo-filter +
// anonymisation are the unit under test.
const getPublishedPromptsPublic = vi.fn();
vi.mock('$lib/services/prompt-query.js', () => ({
	SupabasePromptQueryService: class {
		getPublishedPromptsPublic = getPublishedPromptsPublic;
	}
}));

// Keep the real region centre helper deterministic without pulling Supabase.
vi.mock('$lib/services/location.js', () => ({
	regionMapCenter: () => [52.52, 13.405] as [number, number]
}));

import { load } from './+page.server.js';

function slot(partial: Partial<TimeSlot>): TimeSlot {
	return {
		id: 's',
		prompt_id: 'p',
		start_time: new Date(Date.now() + 86_400_000).toISOString(),
		duration_minutes: 60,
		general_area: 'Mitte',
		general_area_lat: null,
		general_area_lng: null,
		accepted: false,
		created_at: new Date().toISOString(),
		...partial
	};
}

function prompt(partial: Partial<PromptSummary>): PromptSummary {
	return {
		id: 'p',
		author_id: 'real-author-uuid',
		author_username: 'realhandle',
		author_display_name: null,
		title: 'A conversation',
		body_snippet: 'snippet',
		cover_image_url: null,
		available_slots: [],
		soonest_slot: null,
		published_at: new Date().toISOString(),
		region: 'berlin',
		audience_scope: null,
		audience_scope_name: null,
		capacity: null,
		...partial
	};
}

function makeEvent() {
	return {
		locals: { user: null, supabase: {} },
		setHeaders: vi.fn()
	} as unknown as Parameters<typeof load>[0];
}

describe('/ (landing) load', () => {
	beforeEach(() => {
		getPublishedPromptsPublic.mockReset();
	});

	it('drops prompts whose slots have no general_area_lat/lng (no pin possible)', async () => {
		getPublishedPromptsPublic.mockResolvedValue([
			prompt({ id: 'no-geo', available_slots: [slot({ general_area_lat: null, general_area_lng: null })] })
		]);

		const result = (await load(makeEvent())) as { mapPrompts: PromptSummary[] };
		expect(result.mapPrompts).toHaveLength(0);
	});

	it('keeps prompts with at least one geo-located slot', async () => {
		getPublishedPromptsPublic.mockResolvedValue([
			prompt({
				id: 'has-geo',
				available_slots: [
					slot({ general_area_lat: null, general_area_lng: null }),
					slot({ general_area_lat: 52.5, general_area_lng: 13.4 })
				]
			})
		]);

		const result = (await load(makeEvent())) as { mapPrompts: PromptSummary[] };
		expect(result.mapPrompts).toHaveLength(1);
		expect(result.mapPrompts[0].id).toBe('has-geo');
	});

	it('anonymises author identity (author_id cleared, username not the real value)', async () => {
		getPublishedPromptsPublic.mockResolvedValue([
			prompt({
				id: 'has-geo',
				author_id: 'real-author-uuid',
				author_username: 'realhandle',
				available_slots: [slot({ general_area_lat: 52.5, general_area_lng: 13.4 })]
			})
		]);

		const result = (await load(makeEvent())) as { mapPrompts: PromptSummary[] };
		const out = result.mapPrompts[0];
		expect(out.author_id).toBe('');
		expect(out.author_username).not.toBe('realhandle');
		// The placeholder must not embed the real handle anywhere.
		expect(out.author_username).not.toContain('realhandle');
	});

	it('returns the region map centre', async () => {
		getPublishedPromptsPublic.mockResolvedValue([]);
		const result = (await load(makeEvent())) as { mapCenter: [number, number] };
		expect(result.mapCenter).toEqual([52.52, 13.405]);
	});
});
