import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const isAdmin = locals.user?.app_metadata?.role === 'admin';
	if (!isAdmin) redirect(302, '/discover');

	return { isAdmin: true };
};
