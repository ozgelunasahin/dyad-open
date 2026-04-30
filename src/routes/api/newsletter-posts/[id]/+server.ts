import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';

function requireAdmin(locals: App.Locals) {
	const user = requireAuth(locals.user);
	if (user.app_metadata?.role !== 'admin') throw new Response(null, { status: 403 });
	return user;
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try { requireAdmin(locals); } catch { return json({ error: 'Forbidden' }, { status: 403 }); }

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const b = body as Record<string, unknown>;
	const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

	for (const key of ['slug', 'title', 'subtitle', 'author', 'published_at', 'teaser', 'cover_image_url', 'tags', 'body', 'published']) {
		if (key in b) update[key] = b[key];
	}

	const { data, error } = await locals.supabase
		.from('newsletter_posts')
		.update(update)
		.eq('id', params.id)
		.select()
		.single();

	if (error) {
		if (error.code === '23505') return json({ error: 'Slug already exists' }, { status: 409 });
		console.error('[newsletter-posts PATCH]', error.message);
		return json({ error: 'Failed to update post' }, { status: 500 });
	}

	return json(data);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try { requireAdmin(locals); } catch { return json({ error: 'Forbidden' }, { status: 403 }); }

	const { error } = await locals.supabase
		.from('newsletter_posts')
		.delete()
		.eq('id', params.id);

	if (error) {
		console.error('[newsletter-posts DELETE]', error.message);
		return json({ error: 'Failed to delete post' }, { status: 500 });
	}

	return new Response(null, { status: 204 });
};
