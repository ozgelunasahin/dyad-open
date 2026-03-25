import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { renderTiptapToHtml } from '$lib/utils/tiptap-html';
import type { ConversationData } from '$lib/types';

// Fallback sample conversations shown when no landing_highlights are configured.
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const IMG = (n: number) =>
	`${PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/landing%20page%20images/${n}.png`;

function getSampleConversations(): ConversationData[] {
	return [
		{
			id: 'sample-1',
			title: 'What does it mean to truly listen?',
			subtitle: null,
			image_url: IMG(1),
			bodyHtml:
				'<p>Listening is not merely the absence of speaking. It is an act of attention that requires us to suspend our own internal monologue — the constant hum of interpretation, judgment, and anticipation — long enough to receive what another person is actually offering.</p>',
			position: 0,
			proposed_date_1: '2026-03-22T19:00:00+01:00',
			proposed_date_2: '2026-03-24T18:00:00+01:00',
			neighborhood: 'Prenzlauer Berg'
		},
		{
			id: 'sample-2',
			title: 'On arriving in a city you didn\'t choose',
			subtitle: null,
			image_url: IMG(2),
			bodyHtml:
				'<p>There is a particular feeling that arrives when you have left somewhere but not yet arrived somewhere else. Not the physical transit — airports and trains are just corridors — but the interior version of it. You carry a history of gestures and references that belong to another place.</p>',
			position: 1,
			proposed_date_1: '2026-03-23T20:00:00+01:00',
			proposed_date_2: null,
			neighborhood: 'Kreuzberg'
		},
		{
			id: 'sample-3',
			title: 'The art of disagreeing well',
			subtitle: null,
			image_url: IMG(3),
			bodyHtml:
				'<p>Somewhere between argument and agreement lies a space most conversations never reach: the place where two people genuinely hold different views and are both changed by the encounter. Disagreement, done well, is an act of respect.</p>',
			position: 2,
			proposed_date_1: '2026-03-25T19:00:00+01:00',
			proposed_date_2: '2026-03-26T17:30:00+01:00',
			neighborhood: 'Neukölln'
		},
		{
			id: 'sample-4',
			title: 'On solitude and the city',
			subtitle: null,
			image_url: IMG(4),
			bodyHtml:
				'<p>A city is the only place where you can be completely alone in a crowd. Urban solitude is not the same as rural isolation — it is something chosen, curated, and paradoxically social. You carry yourself through other people\'s lives without ever touching them.</p>',
			position: 3,
			proposed_date_1: '2026-03-27T18:30:00+01:00',
			proposed_date_2: null,
			neighborhood: 'Mitte'
		},
		{
			id: 'sample-5',
			title: 'What we owe each other as strangers',
			subtitle: null,
			image_url: IMG(5),
			bodyHtml:
				'<p>The stranger is a peculiar figure — neither friend nor enemy, neither known nor entirely unknown. What is the minimum we owe someone we will never see again? And what might we gain if we treated that encounter as if it mattered?</p>',
			position: 4,
			proposed_date_1: '2026-03-28T19:30:00+01:00',
			proposed_date_2: '2026-03-29T18:00:00+01:00',
			neighborhood: 'Friedrichshain'
		},
		{
			id: 'sample-6',
			title: 'On the pleasure of changing your mind',
			subtitle: null,
			image_url: IMG(6),
			bodyHtml:
				'<p>We treat consistency as a virtue and revision as weakness. But the mind that never changes is not a strong mind — it is a closed one. What would it mean to treat changing your position not as defeat, but as evidence that the conversation worked?</p>',
			position: 5,
			proposed_date_1: '2026-04-01T20:00:00+01:00',
			proposed_date_2: null,
			neighborhood: 'Schöneberg'
		},
		{
			id: 'sample-7',
			title: 'Language and what slips through it',
			subtitle: null,
			image_url: IMG(7),
			bodyHtml:
				'<p>Every language carves the world differently. Some have words for experiences that others cannot name — and with that name comes the ability to notice, to feel, to share. What gets lost in translation is not just vocabulary; it is whole ways of being.</p>',
			position: 6,
			proposed_date_1: '2026-04-03T19:00:00+01:00',
			proposed_date_2: '2026-04-04T17:30:00+01:00',
			neighborhood: 'Mitte'
		},
		{
			id: 'sample-8',
			title: 'On being a beginner again',
			subtitle: null,
			image_url: IMG(8),
			bodyHtml:
				'<p>There is a particular humility required to be a beginner. Most of us spend our adult lives avoiding it — performing competence, staying in lanes we already know. But the beginner\'s mind is where curiosity lives, unencumbered by the weight of expertise.</p>',
			position: 7,
			proposed_date_1: '2026-04-05T18:30:00+01:00',
			proposed_date_2: null,
			neighborhood: 'Charlottenburg'
		}
	];
}

export const load: PageServerLoad = async ({ locals, setHeaders, url }) => {
	const isEditMode = url.searchParams.has('edit') && !!locals.user;

	// Logged-in users go to their canvas/dashboard (unless ?edit mode)
	if (locals.user && !isEditMode) {
		const { data: canvases } = await locals.supabase
			.from('canvases')
			.select('id')
			.order('updated_at', { ascending: false })
			.limit(1);

		redirect(302, '/discover');
	}

	// Load landing highlights (max 3, ordered by position)
	const { data: highlights } = await locals.supabase
		.from('landing_highlights')
		.select('*')
		.order('position', { ascending: true })
		.limit(8);

	const conversations: ConversationData[] = [];

	if (highlights && highlights.length > 0) {
		const canvasIds = highlights
			.map((h) => h.canvas_id)
			.filter((id): id is string => !!id);

		const [canvasesResult, positionsResult] = await Promise.all([
			canvasIds.length > 0
				? locals.supabase
						.from('canvases')
						.select('id, name, entry_point_note_id, cover_image_url')
						.in('id', canvasIds)
				: Promise.resolve({ data: [] }),
			canvasIds.length > 0
				? locals.supabase
						.from('card_positions')
						.select('note_id, x, y, canvas_id')
						.in('canvas_id', canvasIds)
				: Promise.resolve({ data: [] })
		]);

		const canvasMap = new Map(
			(canvasesResult.data ?? []).map((c) => [c.id, c])
		);
		const positionsByCanvas = new Map<string, Array<{ note_id: string; x: number; y: number }>>();
		for (const pos of positionsResult.data ?? []) {
			const list = positionsByCanvas.get(pos.canvas_id) ?? [];
			list.push(pos);
			positionsByCanvas.set(pos.canvas_id, list);
		}

		const entrySlugByCanvas = new Map<string, string>();
		for (const canvas of canvasesResult.data ?? []) {
			const entrySlug = canvas.entry_point_note_id || (() => {
				const positions = positionsByCanvas.get(canvas.id) ?? [];
				if (positions.length > 0) {
					const primary = positions.reduce((best, pos) => {
						const distBest = best.x * best.x + best.y * best.y;
						const distPos = pos.x * pos.x + pos.y * pos.y;
						return distPos < distBest ? pos : best;
					});
					return primary.note_id;
				}
				return null;
			})();
			if (entrySlug) entrySlugByCanvas.set(canvas.id, entrySlug);
		}

		const entrySlugPairs = [...entrySlugByCanvas.entries()];
		const notesByKey = new Map<string, { content: unknown }>();

		if (entrySlugPairs.length > 0) {
			const { data: allNotes } = await locals.supabase
				.from('notes')
				.select('slug, content, canvas_id')
				.in('canvas_id', canvasIds)
				.in('slug', entrySlugPairs.map(([, slug]) => slug));

			for (const note of allNotes ?? []) {
				notesByKey.set(`${note.canvas_id}:${note.slug}`, { content: note.content });
			}
		}

		for (const highlight of highlights) {
			if (!highlight.canvas_id) {
				conversations.push({
					id: highlight.id,
					title: highlight.title,
					subtitle: highlight.subtitle ?? null,
					image_url: highlight.image_url ?? null,
					bodyHtml: highlight.body ? `<p>${highlight.body}</p>` : '',
					position: highlight.position,
					proposed_date_1: highlight.proposed_date_1 ?? null,
					proposed_date_2: highlight.proposed_date_2 ?? null,
					neighborhood: highlight.neighborhood ?? null
				});
				continue;
			}

			const canvas = canvasMap.get(highlight.canvas_id);
			if (!canvas) continue;

			const entrySlug = entrySlugByCanvas.get(canvas.id);
			const note = entrySlug ? notesByKey.get(`${canvas.id}:${entrySlug}`) : null;

			let imageUrl: string | null = highlight.image_url ?? canvas.cover_image_url ?? null;
			let bodyHtml = '';

			if (note?.content) {
				if (!imageUrl) {
					const findFirstImage = (node: any): string | null => {
						if (node.type === 'image' && node.attrs?.src) return node.attrs.src;
						if (node.content && Array.isArray(node.content)) {
							for (const child of node.content) {
								const img = findFirstImage(child);
								if (img) return img;
							}
						}
						return null;
					};
					imageUrl = findFirstImage(note.content);
				}
				bodyHtml = renderTiptapToHtml(note.content as any);
			}

			conversations.push({
				id: highlight.id,
				title: highlight.title || canvas.name,
				subtitle: highlight.subtitle ?? null,
				image_url: imageUrl,
				bodyHtml,
				position: highlight.position,
				proposed_date_1: highlight.proposed_date_1 ?? null,
				proposed_date_2: highlight.proposed_date_2 ?? null,
				neighborhood: highlight.neighborhood ?? null
			});
		}
	}

	const finalConversations = conversations.length > 0 ? conversations : getSampleConversations();

	if (!isEditMode) {
		setHeaders({ 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' });
	}

	return { conversations: finalConversations, isEditMode };
};
