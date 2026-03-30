import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/', secure: dev ? false : options?.secure });
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	// Populate user and session for convenience
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Redirect old /prompts/ URLs to /conversations/
	if (event.url.pathname.startsWith('/prompts/')) {
		const newPath = event.url.pathname.replace('/prompts/', '/conversations/') + event.url.search;
		return new Response(null, { status: 302, headers: { Location: newPath } });
	}

	// Feedback gate: block app access when user has due feedback
	if (user) {
		const pathname = event.url.pathname;

		// Skip gate for static assets, auth routes, feedback routes, and admin
		const isExempt =
			pathname.startsWith('/_app/') ||
			pathname.startsWith('/feedback') ||
			pathname.startsWith('/api/feedback') ||
			pathname.startsWith('/api/auth') ||
			pathname.startsWith('/api/vocabulary') ||
			pathname.startsWith('/auth') ||
			pathname.startsWith('/logout') ||
			pathname.endsWith('.webmanifest') ||
			pathname.startsWith('/service-worker') ||
			pathname.startsWith('/favicon') ||
			pathname.startsWith('/impressum') ||
			pathname.startsWith('/datenschutz');

		if (!isExempt) {
			const { SupabaseGateService } = await import('$lib/services/gate.js');
			const gateService = new SupabaseGateService(event.locals.supabase);
			const gateStatus = await gateService.checkGate(user.id);

			if (gateStatus.gated && gateStatus.feedbackFormId) {
				// Admin bypass: check app_metadata (no DB query — from JWT)
				const isAdmin = event.locals.user?.app_metadata?.role === 'admin';
				if (isAdmin) {
					return resolve(event);
				}

				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'gated', feedbackFormId: gateStatus.feedbackFormId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 303,
					headers: { Location: `/feedback/${gateStatus.feedbackFormId}` }
				});
			}
		}
	}

	return resolve(event);
};
