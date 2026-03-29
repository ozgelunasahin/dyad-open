import { loadLayoutData } from '$lib/server/load-layout-data';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => loadLayoutData(locals);
