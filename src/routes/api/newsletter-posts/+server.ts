import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';

export const GET: RequestHandler = async ({ locals }) => {
	// Public: only published. Admin: all.
	const isAdmin = locals.user?.app_metadata?.role === 'admin';

	let query = locals.supabase
		.from('newsletter_posts')
		.select('id, slug, title, subtitle, author, published_at, teaser, cover_image_url, tags, published')
		.order('published_at', { ascending: false });

	if (!isAdmin) {
		query = query.eq('published', true);
	}

	const { data, error } = await query;
	if (error) return json({ error: 'Failed to load posts' }, { status: 500 });
	return json(data ?? []);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	if (user.app_metadata?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const b = body as Record<string, unknown>;
	if (!b.slug || !b.title) {
		return json({ error: 'slug and title are required' }, { status: 400 });
	}

	const { data, error } = await locals.supabase
		.from('newsletter_posts')
		.insert({
			slug: b.slug,
			title: b.title,
			subtitle: b.subtitle ?? null,
			author: b.author ?? null,
			published_at: b.published_at ?? new Date().toISOString().slice(0, 10),
			teaser: b.teaser ?? '',
			cover_image_url: b.cover_image_url ?? null,
			tags: b.tags ?? [],
			body: b.body ?? { type: 'doc', content: [{ type: 'paragraph' }] },
			published: b.published ?? false
		})
		.select()
		.single();

	if (error) {
		if (error.code === '23505') return json({ error: 'Slug already exists' }, { status: 409 });
		console.error('[newsletter-posts POST]', error.message);
		return json({ error: 'Failed to create post' }, { status: 500 });
	}

	return json(data, { status: 201 });
};
