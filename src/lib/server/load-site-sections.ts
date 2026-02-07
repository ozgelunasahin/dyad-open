import type { SupabaseClient } from '@supabase/supabase-js';
import type { Note, Vault } from '$lib/types';
import type { SavedPosition } from '$lib/stores/canvas.svelte';
import { CARD_WIDTH } from '$lib/types';
import { estimateContentHeight } from '$lib/utils/json-content';

export interface NavItem {
	type?: 'canvas' | 'hero' | 'contact';
	slug: string;
	name: string;
	/** The specific card ID to focus when this nav item is clicked */
	cardId?: string;
}

// Canvas section data — one per site_canvases row (same canvas can appear multiple times)
export interface CanvasSectionData {
	sectionId: string;
	canvasId: string;
	slug: string;
	name: string;
	navLabel: string | null;
	position: number;
	vault: Vault;
	cardPositions: SavedPosition[];
	navNoteId: string | null;
}

export interface HtmlSectionData {
	id: string;
	slug: string;
	name: string;
	type: 'hero' | 'contact';
	position: number;
	config: Record<string, unknown>;
}

export type SectionData = (CanvasSectionData & { type: 'canvas' }) | HtmlSectionData;

/**
 * Load all site sections (canvases + pages) for a given site.
 * Uses bulk queries (.in()) to avoid N+1 per canvas.
 * Same canvas can appear multiple times with different sectionIds.
 */
export async function loadSiteSections(
	supabase: SupabaseClient,
	siteId: string
): Promise<{ allSections: SectionData[] }> {
	// Load pages and canvases in parallel
	const [{ data: sitePages }, { data: siteCanvases }] = await Promise.all([
		supabase
			.from('site_pages')
			.select('id, page_type, title, config, position')
			.eq('site_id', siteId)
			.order('position', { ascending: true }),
		supabase
			.from('site_canvases')
			.select(`
				id,
				canvas_id,
				position,
				nav_note_id,
				nav_label,
				canvases!inner (
					id,
					name,
					slug,
					entry_point_note_id
				)
			`)
			.eq('site_id', siteId)
			.order('position', { ascending: true })
	]);

	const canvasRows = (siteCanvases ?? []).map((sc) => {
		const c = sc.canvases as unknown as { id: string; name: string; slug: string; entry_point_note_id: string | null };
		return {
			sectionId: sc.id as string,
			canvasId: c.id,
			name: c.name,
			slug: c.slug,
			entryPointNoteId: c.entry_point_note_id,
			navNoteId: sc.nav_note_id as string | null,
			navLabel: sc.nav_label as string | null,
			position: sc.position as number
		};
	});

	// Bulk-load all notes and card_positions in 2 queries instead of 2*N
	const canvasIds = [...new Set(canvasRows.map((c) => c.canvasId))];
	let allNotes: Array<{ slug: string; title: string; content: unknown; wikilinks: string[] | null; canvas_id: string }> = [];
	let allPositions: Array<{ id: string; note_id: string; x: number; y: number; width: number; height: number; parent_card_id: string | null; source_link_x: number | null; source_link_y: number | null; canvas_id: string }> = [];

	if (canvasIds.length > 0) {
		const results = await Promise.allSettled([
			supabase
				.from('notes')
				.select('slug, title, content, wikilinks, canvas_id')
				.in('canvas_id', canvasIds),
			supabase
				.from('card_positions')
				.select('id, note_id, x, y, width, height, parent_card_id, source_link_x, source_link_y, canvas_id')
				.in('canvas_id', canvasIds)
		]);

		if (results[0].status === 'fulfilled') {
			allNotes = results[0].value.data ?? [];
		}
		if (results[1].status === 'fulfilled') {
			allPositions = results[1].value.data ?? [];
		}
	}

	// Group by canvas_id
	const notesByCanvas = new Map<string, typeof allNotes>();
	for (const note of allNotes) {
		const list = notesByCanvas.get(note.canvas_id) ?? [];
		list.push(note);
		notesByCanvas.set(note.canvas_id, list);
	}

	const positionsByCanvas = new Map<string, typeof allPositions>();
	for (const pos of allPositions) {
		const list = positionsByCanvas.get(pos.canvas_id) ?? [];
		list.push(pos);
		positionsByCanvas.set(pos.canvas_id, list);
	}

	// Build canvas sections (one per site_canvases row)
	const canvasSections: SectionData[] = canvasRows.map((row) => {
		const notes = notesByCanvas.get(row.canvasId) ?? [];
		const rawPositions = positionsByCanvas.get(row.canvasId) ?? [];

		return {
			type: 'canvas' as const,
			sectionId: row.sectionId,
			canvasId: row.canvasId,
			slug: row.slug,
			name: row.name,
			navLabel: row.navLabel,
			position: row.position,
			vault: {
				entryPoint: row.entryPointNoteId || (notes[0]?.slug ?? ''),
				notes: Object.fromEntries(
					notes.map((n) => [
						n.slug,
						{ id: n.slug, canvasId: n.canvas_id, title: n.title, content: n.content, wikilinks: n.wikilinks ?? [] } as Note
					])
				)
			},
			navNoteId: row.navNoteId,
			cardPositions: rawPositions.map((pos) => ({
				id: pos.id,
				noteId: pos.note_id,
				x: pos.x,
				y: pos.y,
				width: pos.width,
				height: pos.height,
				parentCardId: pos.parent_card_id ?? null,
				sourceLinkX: pos.source_link_x ?? null,
				sourceLinkY: pos.source_link_y ?? null
			}))
		};
	});

	// Build page sections
	const pageSections: SectionData[] = (sitePages ?? []).map((p) => ({
		type: p.page_type as 'hero' | 'contact',
		id: p.id,
		slug: p.id,
		name: p.title || p.page_type,
		position: p.position,
		config: p.config as Record<string, unknown>
	}));

	const allSections = [...canvasSections, ...pageSections].sort((a, b) => a.position - b.position);

	return { allSections };
}

const SECTION_CARD_WIDTH = 600;
const SECTION_CARD_HEIGHT = 300;
const VERTICAL_GAP = 120;

/**
 * Build a single merged vault + saved positions for the landing page canvas.
 * Each unique canvas is merged once (notes + positions). Multiple site_canvases
 * rows pointing to the same canvas just produce additional nav items targeting
 * different cards within that single canvas instance.
 */
export async function buildLandingCanvasData(
	supabase: SupabaseClient,
	siteId: string
): Promise<{ vault: Vault; savedPositions: SavedPosition[]; navItems: NavItem[] }> {
	const { allSections } = await loadSiteSections(supabase, siteId);

	const mergedNotes: Record<string, Note> = {};
	const savedPositions: SavedPosition[] = [];
	const navItems: NavItem[] = [];
	let currentY = 0;

	// Track which canvas slugs have already been merged into the vault
	const mergedCanvasSlugs = new Set<string>();
	// Map canvas slug -> prefix used in the merged vault
	const canvasPrefixMap = new Map<string, string>();

	for (const section of allSections) {
		if (section.type === 'canvas') {
			const canvasData = section as CanvasSectionData & { type: 'canvas' };
			const prefix = canvasData.slug;
			const navName = canvasData.navLabel || canvasData.name;

			// Merge canvas notes + positions only once per unique canvas
			if (!mergedCanvasSlugs.has(canvasData.slug)) {
				mergedCanvasSlugs.add(canvasData.slug);
				canvasPrefixMap.set(canvasData.slug, prefix);

				// Rewrite notes with prefixed slugs
				for (const [noteId, note] of Object.entries(canvasData.vault.notes)) {
					const prefixedId = `${prefix}/${noteId}`;
					const prefixedWikilinks = note.wikilinks.map((link: string) => `${prefix}/${link}`);
					const rewrittenContent = rewriteWikilinksInContent(note.content, prefix);

					mergedNotes[prefixedId] = {
						id: prefixedId,
						canvasId: 'site-landing',
						title: note.title,
						content: rewrittenContent,
						wikilinks: prefixedWikilinks
					};
				}

				// Include saved card positions, offset by currentY
				if (canvasData.cardPositions.length > 0) {
					let minY = Infinity, maxY = -Infinity;

					const dbPrefix = `${canvasData.canvasId}-`;
					const stripDbPrefix = (id: string) =>
						id.startsWith(dbPrefix) ? id.substring(dbPrefix.length) : id;

					for (const pos of canvasData.cardPositions) {
						const prefixedNoteId = `${prefix}/${pos.noteId}`;
						if (!mergedNotes[prefixedNoteId]) continue;

						const prefixedParent = pos.parentCardId
							? `${prefix}/${stripDbPrefix(pos.parentCardId)}`
							: null;

						savedPositions.push({
							id: prefixedNoteId,
							noteId: prefixedNoteId,
							x: pos.x,
							y: pos.y + currentY,
							width: pos.width,
							height: pos.height,
							parentCardId: prefixedParent,
							sourceLinkX: pos.sourceLinkX,
							sourceLinkY: pos.sourceLinkY !== null ? pos.sourceLinkY + currentY : null
						});

						minY = Math.min(minY, pos.y);
						maxY = Math.max(maxY, pos.y + pos.height);
					}

					const sectionHeight = minY === Infinity ? 200 : (maxY - minY);
					currentY += sectionHeight + VERTICAL_GAP;
				} else {
					// No saved positions — place just the entry-point card
					const entryNoteId = canvasData.vault.entryPoint;
					const prefixedEntryId = `${prefix}/${entryNoteId}`;
					const entryNote = canvasData.vault.notes[entryNoteId];

					if (entryNote) {
						const entryHeight = Math.max(100, estimateContentHeight(entryNote.content, CARD_WIDTH));
						savedPositions.push({
							id: prefixedEntryId,
							noteId: prefixedEntryId,
							x: 0,
							y: currentY,
							width: CARD_WIDTH,
							height: entryHeight,
							parentCardId: null,
							sourceLinkX: null,
							sourceLinkY: null
						});
						currentY += entryHeight + VERTICAL_GAP;
					}
				}
			}

			// Every site_canvases row produces a nav item pointing to a card in the (single) canvas
			const resolvedPrefix = canvasPrefixMap.get(canvasData.slug) ?? prefix;
			const navNoteId = canvasData.navNoteId || canvasData.vault.entryPoint;
			navItems.push({
				type: 'canvas',
				slug: canvasData.sectionId,
				name: navName,
				cardId: `${resolvedPrefix}/${navNoteId}`
			});
		} else {
			// HTML section (hero, contact, etc.) — wide block, arbitrary content
			const sectionId = `__section:${section.type}:${section.id}`;
			const htmlSection = section as HtmlSectionData;
			const config = htmlSection.config ?? {};

			mergedNotes[sectionId] = {
				id: sectionId,
				canvasId: 'site-landing',
				title: (config.title as string) || section.name || section.type,
				content: {
					type: 'doc',
					content: config.tagline
						? [{ type: 'paragraph', content: [{ type: 'text', text: config.tagline as string }] }]
						: [{ type: 'paragraph' }]
				} as Note['content'],
				wikilinks: []
			};

			savedPositions.push({
				id: sectionId,
				noteId: sectionId,
				x: -(SECTION_CARD_WIDTH - CARD_WIDTH) / 2,
				y: currentY,
				width: SECTION_CARD_WIDTH,
				height: SECTION_CARD_HEIGHT,
				parentCardId: null,
				sourceLinkX: null,
				sourceLinkY: null
			});
			navItems.push({ type: section.type as 'hero' | 'contact', slug: section.slug, name: section.name, cardId: sectionId });
			currentY += SECTION_CARD_HEIGHT + VERTICAL_GAP;
		}
	}

	// Use first entry as vault entryPoint
	const firstEntry = savedPositions[0]?.noteId ?? '';

	return {
		vault: { notes: mergedNotes, entryPoint: firstEntry },
		savedPositions,
		navItems
	};
}

/**
 * Rewrite wikilink targets in ProseMirror JSON content to use prefixed slugs.
 * Wikilinks are inline nodes: { type: 'wikilink', attrs: { target: 'slug' } }
 */
function rewriteWikilinksInContent(content: unknown, prefix: string): Note['content'] {
	if (!content || typeof content !== 'object') return content as Note['content'];

	const node = content as Record<string, unknown>;

	// Rewrite wikilink node target
	if (node.type === 'wikilink' && node.attrs) {
		const attrs = node.attrs as Record<string, unknown>;
		if (typeof attrs.target === 'string') {
			return {
				...node,
				attrs: { ...attrs, target: `${prefix}/${attrs.target}` }
			} as Note['content'];
		}
	}

	// Recurse into children
	if (Array.isArray(node.content)) {
		return {
			...node,
			content: node.content.map((child: unknown) => rewriteWikilinksInContent(child, prefix))
		} as Note['content'];
	}

	return content as Note['content'];
}
