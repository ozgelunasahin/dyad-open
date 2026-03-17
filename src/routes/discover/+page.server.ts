import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { jsonToPlainText } from '$lib/utils/json-content';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const userId = locals.user.id;

	// Get the current user's profile
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', userId)
		.single();

	// Fetch active conversations from other Berlin-based users
	const { data: conversations } = await locals.supabase
		.from('canvases')
		.select('id, name, slug, user_id, updated_at, cover_image_url, preferred_location, preferred_time_slots')
		.eq('is_conversation', true)
		.eq('active_this_week', true)
		.eq('is_published', true)
		.neq('user_id', userId)
		.order('updated_at', { ascending: false })
		.limit(50);

	if (!conversations || conversations.length === 0) {
		return {
			user: locals.user,
			username: profile?.username ?? '',
			conversations: []
		};
	}

	// Fetch author usernames
	const authorIds = [...new Set(conversations.map((c) => c.user_id))];
	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id, username')
		.in('id', authorIds);

	const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) ?? []);

	// Fetch entry-point notes for text snippets
	const canvasIds = conversations.map((c) => c.id);
	const { data: notes } = canvasIds.length > 0
		? await locals.supabase
				.from('notes')
				.select('canvas_id, content')
				.in('canvas_id', canvasIds)
				.limit(50)
		: { data: [] };

	// Extract first image from TipTap JSON content
	function findFirstImage(node: unknown): string | null {
		if (typeof node !== 'object' || node === null) return null;
		const n = node as Record<string, unknown>;
		if (n.type === 'image' && (n.attrs as Record<string, unknown>)?.src) {
			return (n.attrs as Record<string, unknown>).src as string;
		}
		if (Array.isArray(n.content)) {
			for (const child of n.content) {
				const img = findFirstImage(child);
				if (img) return img;
			}
		}
		return null;
	}

	// Build maps of canvas_id -> first note snippet and first image
	const snippetMap = new Map<string, string>();
	const imageMap = new Map<string, string>();
	for (const note of notes ?? []) {
		if (!snippetMap.has(note.canvas_id)) {
			const plainText = jsonToPlainText(note.content);
			snippetMap.set(note.canvas_id, plainText.slice(0, 200));
		}
		if (!imageMap.has(note.canvas_id)) {
			const img = findFirstImage(note.content);
			if (img) imageMap.set(note.canvas_id, img);
		}
	}

	const enrichedConversations = conversations.map((c) => {
		let days: string[] = [];
		let timeRange = '';
		let locations: string[] = [];

		try {
			if (c.preferred_time_slots) {
				const parsed = JSON.parse(c.preferred_time_slots);
				if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
					if (Array.isArray(parsed.slots)) {
						// Per-slot format: { slots: [{ date, startTime, duration, postcode, exactLocation }] }
						const dateSet = new Set<string>();
						for (const slot of parsed.slots) {
							if (slot.date) {
								const dt = new Date(slot.date + 'T12:00:00');
								dateSet.add(dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
							}
						}
						days = [...dateSet];
					} else if (Array.isArray(parsed.dates)) {
						// Legacy structured format: { dates, startTime, duration }
						days = parsed.dates.map((d: string) => {
							const dt = new Date(d + 'T12:00:00');
							return dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
						});
						if (parsed.startTime) {
							const [h, m] = parsed.startTime.split(':').map(Number);
							const start = new Date(2000, 0, 1, h, m);
							const end = new Date(start.getTime() + (parsed.duration ?? 60) * 60000);
							const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
							timeRange = `${fmt(start)} – ${fmt(end)}`;
						}
					}
				} else if (Array.isArray(parsed)) {
					// Legacy format: string array
					days = parsed;
				}
			}
		} catch { /* ignore */ }
		try { if (c.preferred_location) locations = JSON.parse(c.preferred_location); } catch { /* ignore */ }

		// Derive display name: use first line of snippet if still "Untitled"
		const snippet = snippetMap.get(c.id) ?? '';
		const displayName = c.name === 'Untitled' && snippet
			? snippet.split('\n')[0].slice(0, 80)
			: c.name;

		return {
			id: c.id,
			name: displayName,
			slug: c.slug,
			userId: c.user_id,
			username: usernameMap.get(c.user_id) ?? 'unknown',
			updatedAt: c.updated_at,
			snippet,
			coverImageUrl: c.cover_image_url ?? imageMap.get(c.id) ?? null,
			days,
			timeRange,
			locations
		};
	});

	return {
		user: locals.user,
		username: profile?.username ?? '',
		conversations: enrichedConversations
	};
};
