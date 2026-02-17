import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { renderTiptapToHtml } from '$lib/utils/tiptap-html';

export const load: PageServerLoad = async ({ locals, setHeaders, url }) => {
	const isEditMode = url.searchParams.has('edit') && !!locals.user;

	// Logged-in users go to their canvas/dashboard (unless ?edit mode)
	if (locals.user && !isEditMode) {
		const { data: canvases } = await locals.supabase
			.from('canvases')
			.select('id')
			.order('updated_at', { ascending: false })
			.limit(1);

		if (canvases && canvases.length > 0) {
			redirect(302, `/canvas/${canvases[0].id}`);
		}
		redirect(302, '/dashboard');
	}

	// Non-logged-in users see the landing page
	// Load published "dyad" and "weaving" canvases directly by slug
	const { data: canvases } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, entry_point_note_id, user_id, cover_image_url')
		.eq('is_published', true)
		.in('slug', ['dyad', 'weaving'])
		.order('slug', { ascending: true }); // dyad first, then weaving

	if (!canvases || canvases.length === 0) {
		return { sections: [], navItems: [] };
	}

	// Build sections and navItems
	const sections = [];
	const navItems = [];

	for (const canvas of canvases) {
		// Load all notes and positions for each canvas
		const [notesResult, positionsResult] = await Promise.all([
			locals.supabase
				.from('notes')
				.select('slug, title, content, wikilinks')
				.eq('canvas_id', canvas.id)
				.order('created_at', { ascending: true }),
			locals.supabase
				.from('card_positions')
				.select('*')
				.eq('canvas_id', canvas.id)
		]);

		// Derive entry point: explicit setting > primary card on canvas > first note
		const entryPointSlug = canvas.entry_point_note_id || (() => {
			const positions = positionsResult.data;
			if (positions && positions.length > 0) {
				// Primary card = closest to canvas origin (0,0)
				const primary = positions.reduce((best, pos) => {
					const distBest = best.x * best.x + best.y * best.y;
					const distPos = pos.x * pos.x + pos.y * pos.y;
					return distPos < distBest ? pos : best;
				});
				return primary.note_id;
			}
			return notesResult.data?.[0]?.slug || '';
		})();

		const vault = {
			notes: Object.fromEntries(
				(notesResult.data || []).map(n => [n.slug, {
					id: n.slug,
					canvasId: canvas.id,
					title: n.title,
					content: n.content,
					wikilinks: n.wikilinks || []
				}])
			),
			entryPoint: entryPointSlug
		};

		const cardPositions = (positionsResult.data || []).map(pos => ({
			id: pos.id,
			noteId: pos.note_id,
			x: pos.x,
			y: pos.y,
			width: pos.width,
			height: pos.height,
			parentCardId: pos.parent_card_id ?? null,
			sourceLinkX: pos.source_link_x ?? null,
			sourceLinkY: pos.source_link_y ?? null
		}));

		// Extract first image from entry point note content, fall back to cover_image_url
		let coverImageUrl: string | null = null;
		if (notesResult.data) {
			// Check entry point note first, then other notes
			const entryNote = notesResult.data.find(n => n.slug === entryPointSlug);
			const orderedNotes = entryNote
				? [entryNote, ...notesResult.data.filter(n => n.slug !== entryPointSlug)]
				: notesResult.data;

			for (const note of orderedNotes) {
				if (note.content && typeof note.content === 'object') {
					const findFirstImage = (node: any): string | null => {
						if (node.type === 'image' && node.attrs?.src) {
							return node.attrs.src;
						}
						if (node.content && Array.isArray(node.content)) {
							for (const child of node.content) {
								const imageUrl = findFirstImage(child);
								if (imageUrl) return imageUrl;
							}
						}
						return null;
					};
					coverImageUrl = findFirstImage(note.content);
					if (coverImageUrl) break;
				}
			}
		}
		if (!coverImageUrl) {
			coverImageUrl = canvas.cover_image_url;
		}

		// Strip the first image from the entry point note so it doesn't
		// render inside the canvas card (it's already the hero image)
		if (coverImageUrl && vault.notes[entryPointSlug]) {
			const note = vault.notes[entryPointSlug];
			if (note.content?.content) {
				let removed = false;
				const stripFirstImage = (nodes: any[]): any[] =>
					nodes.reduce((acc: any[], node: any) => {
						if (removed) {
							acc.push(node);
							return acc;
						}
						// Remove a paragraph/node that contains only an image
						if (node.type === 'paragraph' && node.content?.length === 1 && node.content[0].type === 'image') {
							removed = true;
							return acc; // skip entire paragraph
						}
						// Remove a bare image node
						if (node.type === 'image') {
							removed = true;
							return acc;
						}
						// Recurse into children
						if (node.content) {
							acc.push({ ...node, content: stripFirstImage(node.content) });
						} else {
							acc.push(node);
						}
						return acc;
					}, []);
				note.content = { ...note.content, content: stripFirstImage(note.content.content) };
				console.log(`[Landing] Stripped first image from ${entryPointSlug}: removed=${removed}`);
			}
		} else {
			console.log(`[Landing] No stripping for ${canvas.slug}: coverImageUrl=${!!coverImageUrl}, entryNote=${!!vault.notes[entryPointSlug]}, entryPointSlug=${entryPointSlug}`);
		}

		// Render entry point note as HTML for hero overlay text
		let coverHtml = '';
		if (coverImageUrl && vault.notes[entryPointSlug]) {
			coverHtml = renderTiptapToHtml(vault.notes[entryPointSlug].content);
		}

		sections.push({
			type: 'canvas',
			sectionId: canvas.slug,
			name: canvas.name,
			canvasId: canvas.id,
			vault,
			cardPositions,
			coverImageUrl,
			coverHtml
		});

		navItems.push({
			name: canvas.name,
			slug: canvas.slug
		});
	}

	// Load landing highlights
	const { data: highlights } = await locals.supabase
		.from('landing_highlights')
		.select('*')
		.order('position', { ascending: true });

	// Add field-notes to nav only if there are highlights
	if (highlights && highlights.length > 0) {
		navItems.push({
			name: 'field notes',
			slug: 'field-notes'
		});
	}

	// Cache for anonymous users (skip in edit mode)
	if (!isEditMode) {
		setHeaders({
			'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
		});
	}

	return { sections, navItems, highlights: highlights || [], isEditMode };
};
