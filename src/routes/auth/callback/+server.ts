import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Supabase-specific callback: handles magic links and password-reset codes.
// When the substrate is replaced with an OIDC provider, this route becomes
// the OIDC redirect_uri and calls identityPort.authenticate({ kind: 'oidc-callback', request }).
export const GET: RequestHandler = async ({ url, locals, request: _request }) => {
	const code = url.searchParams.get('code');
	const type = url.searchParams.get('type');

	if (code) {
		// Supabase code exchange. For OIDC: replace with
		// await locals.identityPort.authenticate({ kind: 'oidc-callback', request });
		await locals.supabase.auth.exchangeCodeForSession(code);
	}

	// Handle password recovery - redirect to login with update mode
	if (type === 'recovery') {
		redirect(303, '/login?mode=update');
	}

	redirect(303, '/discover');
};
