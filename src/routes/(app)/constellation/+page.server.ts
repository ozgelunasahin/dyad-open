import type { PageServerLoad } from './$types';
import type { JSONContent } from '@tiptap/core';
import { MOCK_PROMPTS } from '$lib/data/mock-prompts.js';
import type { ConstellationCard } from '$lib/types/constellation.js';

function extractSnippet(body: unknown): string {
	if (!body || typeof body !== 'object') return '';
	const texts: string[] = [];

	function walk(nodes: JSONContent[]) {
		for (const n of nodes) {
			if (typeof n.text === 'string') texts.push(n.text);
			if (n.content) walk(n.content);
			if (texts.join('').length > 240) return;
		}
	}

	const doc = body as JSONContent;
	if (doc.content) walk(doc.content);

	const t = texts.join('').trim();
	return t.length <= 210 ? t : t.slice(0, 207) + '…';
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user?.id;

	const [{ data: published }, { data: archived }] = await Promise.all([
		locals.supabase
			.from('prompts')
			.select('id, title, body, cover_image_url, author_id')
			.eq('state', 'published')
			.eq('region', 'berlin')
			.order('published_at', { ascending: false })
			.limit(40),
		locals.supabase
			.from('prompts')
			.select('id, title, body, cover_image_url, author_id')
			.eq('state', 'archived')
			.eq('region', 'berlin')
			.order('archived_at', { ascending: false })
			.limit(30),
	]);

	const allRows = [...(published ?? []), ...(archived ?? [])];

	let profileMap = new Map<string, string>();
	if (allRows.length > 0) {
		const authorIds = [...new Set(allRows.map((p) => p.author_id))];
		const { data: profiles } = await locals.supabase
			.from('profiles')
			.select('id, username')
			.in('id', authorIds);

		for (const p of profiles ?? []) {
			profileMap.set(p.id, p.username);
		}
	}

	const dbCards: ConstellationCard[] = [
		...(published ?? []).map((p) => ({
			id: p.id,
			title: p.title ?? 'Untitled',
			snippet: extractSnippet(p.body),
			cover_image_url: p.cover_image_url,
			author_username: profileMap.get(p.author_id) ?? 'anonymous',
			archived: false,
			href: `/conversations/${p.id}`,
		})),
		...(archived ?? []).map((p) => ({
			id: p.id,
			title: p.title ?? 'Untitled',
			snippet: extractSnippet(p.body),
			cover_image_url: p.cover_image_url,
			author_username: profileMap.get(p.author_id) ?? 'anonymous',
			archived: true,
			href: `/conversations/${p.id}`,
		})),
	];

	// Mix in mock prompts so early-alpha users see a populated constellation
	const mockCards: ConstellationCard[] = MOCK_PROMPTS.map((p) => ({
		id: p.id,
		title: p.title ?? 'Untitled',
		snippet: p.body_snippet,
		cover_image_url: p.cover_image_url,
		author_username: p.author_username,
		archived: false,
		href: `/conversations/${p.id}`,
	}));

	// Deduplicate: real cards take priority over mock cards with the same id
	const seen = new Set(dbCards.map((c) => c.id));
	const cards = [...dbCards, ...mockCards.filter((c) => !seen.has(c.id))];

	return { cards };
};
