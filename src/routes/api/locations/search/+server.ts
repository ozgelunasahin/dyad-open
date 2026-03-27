import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth.js';
import { searchLocations } from '$lib/services/location.js';

const MAX_QUERY_LENGTH = 200;

/** GET /api/locations/search?q=...&region=berlin */
export const GET: RequestHandler = async ({ url, locals }) => {
	requireAuth(locals.user);

	const q = url.searchParams.get('q')?.trim() ?? '';
	const region = url.searchParams.get('region') ?? 'berlin';

	if (q.length < 2) {
		return json([]);
	}

	if (q.length > MAX_QUERY_LENGTH) {
		return json({ error: 'Query too long' }, { status: 400 });
	}

	const results = await searchLocations(q, region);
	return json(results);
};
