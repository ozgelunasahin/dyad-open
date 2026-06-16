import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SupabasePromptQueryService } from '$lib/services/prompt-query.js';
import { regionMapCenter } from '$lib/services/location.js';
import { MOCK_PROMPTS } from '$lib/data/mock-prompts.ts';
import type { ConstellationCard } from '$lib/types/constellation.js';
import type { PromptSummary } from '$lib/domain/types.js';
import type { JSONContent } from '@tiptap/core';

function extractSnippet(body: unknown): string {
	if (!body || typeof body !== 'object') return '';
	const texts: string[] = [];
	function walk(nodes: JSONContent[]) {
		for (const n of nodes) {
			if (typeof n.text === 'string') texts.push(n.text);
			if (n.content) walk(n.content);
			if (texts.join('').length > 220) return;
		}
	}
	const doc = body as JSONContent;
	if (doc.content) walk(doc.content);
	const t = texts.join('').trim();
	return t.length <= 200 ? t : t.slice(0, 197) + '…';
}

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	if (locals.user) {
		redirect(302, '/discover');
	}

	setHeaders({ 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });

	let realCards: ConstellationCard[] = [];
	// Geo-tagged published conversations for the landing map (Berlin pins).
	let mapPrompts: PromptSummary[] = [];
	try {
		const [published, { data: archivedRows }] = await Promise.all([
			new SupabasePromptQueryService(locals.supabase)
				.getPublishedPromptsPublic({ region: 'berlin', limit: 20 }),
			locals.supabase
				.from('prompts')
				.select('id, title, body, cover_image_url, author_id')
				.eq('state', 'archived')
				.eq('region', 'berlin')
				.order('archived_at', { ascending: false })
				.limit(20),
		]);

		// Only conversations with a geo-located slot can show a pin on the map.
		mapPrompts = published.filter((p) =>
			p.available_slots.some((s) => s.general_area_lat != null && s.general_area_lng != null)
		);

		realCards = [
			...published.map((p) => ({
				id: p.id,
				title: p.title ?? 'Untitled',
				snippet: p.body_snippet,
				cover_image_url: p.cover_image_url,
				author_username: p.author_username,
				archived: false,
				href: '/join',
			})),
			...(archivedRows ?? []).map((p) => ({
				id: p.id,
				title: p.title ?? 'Untitled',
				snippet: extractSnippet(p.body),
				cover_image_url: p.cover_image_url,
				author_username: '•••',
				archived: true,
				href: '/join',
			})),
		];
	} catch {
		// Supabase unavailable — fall through to mock data only
	}

	// Mock fill — alternate archived/live so the constellation looks inhabited
	const seen = new Set(realCards.map((c) => c.id));
	const mockCards: ConstellationCard[] = MOCK_PROMPTS.filter((p) => !seen.has(p.id)).map(
		(p, i) => ({
			id: p.id,
			title: p.title ?? 'Untitled',
			snippet: p.body_snippet,
			cover_image_url: p.cover_image_url,
			author_username: p.author_username,
			archived: i % 3 === 0, // every third mock card shows as archived
			href: '/join',
		})
	);

	// When no live conversations have a location yet (e.g. Supabase down in dev),
	// fall back to mock pins so the map still reads as an inhabited Berlin.
	const mapPromptsOrMock = mapPrompts.length > 0
		? mapPrompts
		: MOCK_PROMPTS.filter((p) =>
			p.available_slots.some((s) => s.general_area_lat != null && s.general_area_lng != null)
		);

	return {
		cards: [...realCards, ...mockCards],
		mapPrompts: mapPromptsOrMock,
		mapCenter: regionMapCenter('berlin')
	};
};
