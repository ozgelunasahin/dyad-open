import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { deleteSession } from '$lib/server/db/operations';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (locals.session) {
		await deleteSession(locals.session.id);
	}

	cookies.delete('session', { path: '/' });

	redirect(302, '/login');
};
