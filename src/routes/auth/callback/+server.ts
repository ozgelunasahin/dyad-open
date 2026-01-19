import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const type = url.searchParams.get('type');

	if (code) {
		await locals.supabase.auth.exchangeCodeForSession(code);
	}

	// Handle password recovery - redirect to login with update mode
	if (type === 'recovery') {
		redirect(303, '/login?mode=update');
	}

	redirect(303, '/dashboard');
};
