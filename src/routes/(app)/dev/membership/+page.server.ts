import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Dev-only membership states viewer. 404 in production so it never ships live.
export const load: PageServerLoad = () => {
	if (!dev) throw error(404, 'Not found');
	return {};
};
