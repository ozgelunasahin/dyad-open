import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	// Logged-in users go to their canvas/dashboard
	if (locals.user) {
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
	// Load published "dyad" and "tetrad" canvases directly by slug
	const { data: canvases } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, entry_point_note_id, user_id, cover_image_url')
		.eq('is_published', true)
		.in('slug', ['dyad', 'tetrad'])
		.order('slug', { ascending: true }); // dyad first, then tetrad

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
				.eq('canvas_id', canvas.id),
			locals.supabase
				.from('card_positions')
				.select('*')
				.eq('canvas_id', canvas.id)
		]);

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
			entryPoint: canvas.entry_point_note_id || (notesResult.data?.[0]?.slug || '')
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

		// Extract first image from any note if cover_image not set
		let coverImageUrl = canvas.cover_image_url;
		if (!coverImageUrl && notesResult.data) {
			for (const note of notesResult.data) {
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

		sections.push({
			type: 'canvas',
			sectionId: canvas.slug,
			name: canvas.name,
			canvasId: canvas.id,
			vault,
			cardPositions,
			coverImageUrl
		});

		navItems.push({
			name: canvas.name,
			slug: canvas.slug
		});
	}

	// Cache for anonymous users
	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
	});

	return { sections, navItems };
};
