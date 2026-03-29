import { redirect } from '@sveltejs/kit';
import { loadLayoutData } from '$lib/server/load-layout-data';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// loadLayoutData handles the auth check + redirect
	const layoutData = await loadLayoutData(locals);

	if (!layoutData.isAdmin) redirect(302, '/discover');

	return layoutData;
};
