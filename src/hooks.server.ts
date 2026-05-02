import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { createSupabaseAdapter } from '@prefig/upact-supabase';

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
	event.locals.identityPort = createSupabaseAdapter(event.locals.supabase);

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

	// TODO (Phase E): replace safeGetSession() with identityPort.currentUpactor(event.request)
	// so per-request identity resolves through the port rather than calling Supabase Auth
	// directly. Requires: (1) locals.upactor: Upactor | null added to App.Locals,
	// (2) feedback gate uses upactor.id.
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Admin status from profiles.is_admin — application-owned, substrate-agnostic.
	// Replaces the former app_metadata.role === 'admin' check (Supabase-specific).
	if (user) {
		const { data: profile } = await event.locals.supabase
			.from('profiles')
			.select('is_admin')
			.eq('id', user.id)
			.single();
		event.locals.isAdmin = profile?.is_admin ?? false;
	} else {
		event.locals.isAdmin = false;
	}

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
			// Advance any meetings whose scheduled_time has passed — creates feedback_forms with state='due'
			try { await event.locals.supabase.rpc('advance_scheduled_meetings'); } catch { /* fail open */ }

			const { SupabaseGateService } = await import('$lib/services/gate.js');
			const gateService = new SupabaseGateService(event.locals.supabase);
			const gateStatus = await gateService.checkGate(user.id);

			if (gateStatus.gated && gateStatus.feedbackFormId) {
				if (!event.locals.isAdmin) {
					if (pathname.startsWith('/api/')) {
						return new Response(JSON.stringify({ error: 'gated', feedbackFormId: gateStatus.feedbackFormId }), {
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					// Store in locals so the layout renders the feedback modal instead of redirecting
					(event.locals as any).pendingFeedbackFormId = gateStatus.feedbackFormId;
				}
			}
		}
	}

	return resolve(event);
};
