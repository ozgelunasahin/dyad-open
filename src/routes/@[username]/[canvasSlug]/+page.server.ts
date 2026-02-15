import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	// First, get the user's profile by username
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, username')
		.eq('username', params.username)
		.single();

	if (!profile) {
		error(404, 'User not found');
	}

	const isOwner = locals.user?.id === profile.id;
	const forceReadOnly = url.searchParams.get('readonly') === 'true';

	// Get the canvas for that user (check publish status based on ownership)
	const { data: canvas, error: canvasError } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, user_id, entry_point_note_id, is_published, is_conversation, preferred_location, preferred_time_slots')
		.eq('user_id', profile.id)
		.eq('slug', params.canvasSlug)
		.single();

	if (canvasError || !canvas) {
		error(404, 'Canvas not found');
	}

	// If owner is viewing their own canvas, redirect to edit view
	// Unless readonly mode is explicitly requested (for site preview/publish)
	if (isOwner && !forceReadOnly) {
		redirect(302, `/canvas/${canvas.id}`);
	}

	// For non-owners, only allow viewing published canvases
	// Owners can view their own unpublished canvases in readonly mode
	if (!canvas.is_published && !isOwner) {
		error(404, 'Canvas not found');
	}

	// Load saved card positions
	const { data: rawPositions } = await locals.supabase
		.from('card_positions')
		.select('id, note_id, x, y, width, height, parent_card_id, source_link_x, source_link_y')
		.eq('canvas_id', canvas.id);

	// Transform to match SavedPosition interface
	const cardPositions = (rawPositions ?? []).map((pos) => ({
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

	// Load notes for this canvas (canvas-scoped notes)
	// RLS policy allows viewing notes linked to published canvases
	const { data: notes } = await locals.supabase
		.from('notes')
		.select('slug, title, content, wikilinks, canvas_id')
		.eq('canvas_id', canvas.id);

	// Build vault object for the canvas store
	const vault = {
		entryPoint: canvas.entry_point_note_id || (notes?.[0]?.slug ?? ''),
		notes: Object.fromEntries(
			(notes ?? []).map((n) => [
				n.slug,
				{
					id: n.slug,
					canvasId: n.canvas_id,
					title: n.title,
					content: n.content,
					wikilinks: n.wikilinks ?? []
				}
			])
		)
	};

	// Load highlights + comments for conversation canvases
	let highlights: Array<{
		id: string;
		canvas_id: string;
		note_slug: string;
		user_id: string;
		username: string;
		selected_text: string;
		start_offset: number;
		end_offset: number;
		created_at: string;
		comments: Array<{
			id: string;
			user_id: string;
			username: string;
			body: string;
			created_at: string;
		}>;
	}> = [];

	const { data: rawHighlights } = await locals.supabase
		.from('highlights')
		.select(`
			id, canvas_id, note_slug, user_id, selected_text, start_offset, end_offset, created_at,
			comments (id, user_id, body, created_at)
		`)
		.eq('canvas_id', canvas.id)
		.order('created_at', { ascending: true });

	if (rawHighlights && rawHighlights.length > 0) {
		const highlightUserIds = new Set<string>();
		for (const h of rawHighlights) {
			highlightUserIds.add(h.user_id);
			for (const c of h.comments ?? []) {
				highlightUserIds.add((c as { user_id: string }).user_id);
			}
		}

		const { data: highlightProfiles } = await locals.supabase
			.from('profiles')
			.select('id, username')
			.in('id', [...highlightUserIds]);

		const usernameMap = new Map(highlightProfiles?.map((p) => [p.id, p.username]) ?? []);

		highlights = rawHighlights.map((h) => ({
			...h,
			username: usernameMap.get(h.user_id) ?? 'unknown',
			comments: (h.comments ?? []).map((c: any) => ({
				...c,
				username: usernameMap.get(c.user_id) ?? 'unknown'
			}))
		}));
	}

	return {
		canvas: {
			id: canvas.id,
			name: canvas.name,
			slug: canvas.slug,
			entryPointNoteId: canvas.entry_point_note_id,
			isConversation: canvas.is_conversation ?? false,
			preferredLocation: canvas.preferred_location ?? '',
			preferredTimeSlots: canvas.preferred_time_slots ?? ''
		},
		author: {
			id: profile.id,
			username: params.username
		},
		cardPositions,
		vault,
		readOnly: true,
		highlights,
		currentUserId: locals.user?.id ?? null
	};
};
