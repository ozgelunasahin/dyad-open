import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_HIGHLIGHTS = 3;

export const GET: RequestHandler = async ({ locals }) => {
	const { data, error } = await locals.supabase
		.from('landing_highlights')
		.select('*')
		.order('position', { ascending: true });

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Enforce max 3 highlights
	const { count } = await locals.supabase
		.from('landing_highlights')
		.select('*', { count: 'exact', head: true });

	if (count !== null && count >= MAX_HIGHLIGHTS) {
		return json({ error: `Maximum ${MAX_HIGHLIGHTS} highlights allowed` }, { status: 400 });
	}

	const body = await request.json();
	const { title, subtitle, image_url, link, position, canvas_id, format } = body;

	if (!title && !canvas_id) {
		return json({ error: 'Title or canvas_id is required' }, { status: 400 });
	}

	// If canvas_id provided, auto-populate from canvas data
	let finalTitle = title;
	let finalLink = link;
	let finalImageUrl = image_url;

	if (canvas_id) {
		// Check not already highlighted
		const { data: existing } = await locals.supabase
			.from('landing_highlights')
			.select('id')
			.eq('canvas_id', canvas_id)
			.maybeSingle();

		if (existing) {
			return json({ error: 'Canvas is already highlighted' }, { status: 400 });
		}

		// Fetch canvas data
		const { data: canvas } = await locals.supabase
			.from('canvases')
			.select('id, name, slug, user_id, cover_image_url, is_published')
			.eq('id', canvas_id)
			.single();

		if (!canvas) {
			return json({ error: 'Canvas not found' }, { status: 404 });
		}

		finalTitle = finalTitle || canvas.name;
		finalLink = finalLink || `/essay/${canvas.slug}`;

		// Auto-publish the canvas so the public link works
		if (!canvas.is_published) {
			await locals.supabase
				.from('canvases')
				.update({ is_published: true, updated_at: new Date().toISOString() })
				.eq('id', canvas_id);
		}

		// Extract cover image from canvas notes if not set on canvas
		if (!finalImageUrl) {
			finalImageUrl = canvas.cover_image_url || null;

			if (!finalImageUrl) {
				// Try to extract first image from canvas notes
				const { data: notes } = await locals.supabase
					.from('notes')
					.select('content')
					.eq('canvas_id', canvas_id)
					.limit(10);

				if (notes) {
					for (const note of notes) {
						if (note.content && typeof note.content === 'object') {
							const findFirstImage = (node: any): string | null => {
								if (node.type === 'image' && node.attrs?.src) return node.attrs.src;
								if (node.content && Array.isArray(node.content)) {
									for (const child of node.content) {
										const url = findFirstImage(child);
										if (url) return url;
									}
								}
								return null;
							};
							finalImageUrl = findFirstImage(note.content);
							if (finalImageUrl) break;
						}
					}
				}
			}
		}
	}

	const { data, error } = await locals.supabase
		.from('landing_highlights')
		.insert({
			user_id: locals.user.id,
			title: finalTitle || 'Untitled',
			subtitle: subtitle || null,
			image_url: finalImageUrl || null,
			link: finalLink || null,
			position: position ?? 0,
			canvas_id: canvas_id || null,
			format: format || 'essay'
		})
		.select()
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json(data, { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { id, title, subtitle, image_url, link, position, format } = body;

	if (!id) {
		return json({ error: 'Highlight id is required' }, { status: 400 });
	}

	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (title !== undefined) updates.title = title;
	if (subtitle !== undefined) updates.subtitle = subtitle;
	if (image_url !== undefined) updates.image_url = image_url;
	if (link !== undefined) updates.link = link;
	if (position !== undefined) updates.position = position;
	if (format !== undefined) updates.format = format;

	const { data, error } = await locals.supabase
		.from('landing_highlights')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { id, canvas_id } = body;

	if (!id && !canvas_id) {
		return json({ error: 'Highlight id or canvas_id is required' }, { status: 400 });
	}

	let query = locals.supabase.from('landing_highlights').delete();
	if (id) {
		query = query.eq('id', id);
	} else {
		query = query.eq('canvas_id', canvas_id);
	}

	const { error } = await query;

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
};
