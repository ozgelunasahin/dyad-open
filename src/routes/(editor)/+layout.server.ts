import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	return {
		user: locals.user,
		username: profile?.username ?? ''
	};
};
