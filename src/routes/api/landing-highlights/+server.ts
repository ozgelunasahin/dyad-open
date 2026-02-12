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
	const { title, subtitle, image_url, link, position } = body;

	if (!title) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const { data, error } = await locals.supabase
		.from('landing_highlights')
		.insert({
			user_id: locals.user.id,
			title,
			subtitle: subtitle || null,
			image_url: image_url || null,
			link: link || null,
			position: position ?? 0
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
	const { id, title, subtitle, image_url, link, position } = body;

	if (!id) {
		return json({ error: 'Highlight id is required' }, { status: 400 });
	}

	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (title !== undefined) updates.title = title;
	if (subtitle !== undefined) updates.subtitle = subtitle;
	if (image_url !== undefined) updates.image_url = image_url;
	if (link !== undefined) updates.link = link;
	if (position !== undefined) updates.position = position;

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
	const { id } = body;

	if (!id) {
		return json({ error: 'Highlight id is required' }, { status: 400 });
	}

	const { error } = await locals.supabase
		.from('landing_highlights')
		.delete()
		.eq('id', id);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
};
