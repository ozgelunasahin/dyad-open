import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';
import { routeKind } from '$lib/server/route-kind';
import { getAuthorizedAdminOperator } from '$lib/server/admin-auth';
import { firstAccessContextRow } from '$lib/server/access-context';

const ADMIN_HOSTNAME = 'admin.dyad.berlin';
const APEX_HOSTNAME = 'dyad.berlin';
const PAGES_PREVIEW_HOSTNAME = 'dyad-berlin.pages.dev';
const AMSTERDAM_HOSTNAME = 'dyad.amsterdam';
const SECONDARY_APEX_HOSTNAMES = [AMSTERDAM_HOSTNAME];
const ALIAS_HOSTNAMES = ['www.dyad.amsterdam'];

const HOST_REGIONS: Record<string, string> = {
	[AMSTERDAM_HOSTNAME]: 'amsterdam'
};

export const handle: Handle = async ({ event, resolve }) => {
	const loopbackAdmitted = dev || env.E2E_LOOPBACK === '1';
	const kind = routeKind(event.url, {
		devMode: loopbackAdmitted,
		apexHostname: APEX_HOSTNAME,
		adminHostname: ADMIN_HOSTNAME,
		previewHostname: PAGES_PREVIEW_HOSTNAME,
		secondaryApexHostnames: SECONDARY_APEX_HOSTNAMES,
		aliasHostnames: ALIAS_HOSTNAMES
	});

	if (kind === 'reject') {
		return new Response(null, { status: 404 });
	}

	if (kind === 'alias-redirect') {
		return new Response(null, {
			status: 302,
			headers: {
				Location: `https://${AMSTERDAM_HOSTNAME}${event.url.pathname}${event.url.search}`
			}
		});
	}

	if (kind === 'apex-redirect') {
		const adminPath = event.url.pathname.replace(/^\/admin/, '') || '/';
		return new Response(null, {
			status: 301,
			headers: { Location: `https://${ADMIN_HOSTNAME}${adminPath}${event.url.search}` }
		});
	}

	if (kind === 'admin') {
		const operator = await getAuthorizedAdminOperator(event.request);
		if (!operator) {
			return new Response(
				'Admin access requires Cloudflare Access authentication.',
				{ status: 401, headers: { 'Content-Type': 'text/plain' } }
			);
		}
		return resolve(event);
	}

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

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;
	event.locals.scopes = [];
	event.locals.homeScope = null;
	event.locals.homeRegion = null;
	event.locals.accessExpiresAt = null;
	event.locals.hostRegion = HOST_REGIONS[event.url.hostname.replace(/\.$/, '')] ?? null;

	// Redirect old /prompts/ URLs to /conversations/
	if (event.url.pathname.startsWith('/prompts/')) {
		const newPath = event.url.pathname.replace('/prompts/', '/conversations/') + event.url.search;
		return new Response(null, { status: 302, headers: { Location: newPath } });
	}

	// Redirect anonymous visitors on the conference host to the Berlin apex
	if (
		!user &&
		event.url.pathname === '/' &&
		event.url.hostname.replace(/\.$/, '') === AMSTERDAM_HOSTNAME
	) {
		return new Response(null, {
			status: 302,
			headers: { Location: `https://${APEX_HOSTNAME}/` }
		});
	}

	if (user) {
		const pathname = event.url.pathname;

		const isExempt =
			pathname.startsWith('/_app/') ||
			pathname.startsWith('/feedback') ||
			pathname.startsWith('/api/feedback') ||
			pathname.startsWith('/api/auth') ||
			pathname.startsWith('/api/vocabulary') ||
			pathname.startsWith('/auth') ||
			pathname.startsWith('/logout') ||
			pathname.startsWith('/access-ended') ||
			pathname.endsWith('.webmanifest') ||
			pathname.startsWith('/service-worker') ||
			pathname.startsWith('/favicon') ||
			pathname.startsWith('/impressum') ||
			pathname.startsWith('/datenschutz');

		if (!isExempt) {
			// Load scoping context once per request
			const { data: ctxRows, error: ctxError } = await event.locals.supabase.rpc(
				'get_my_access_context'
			);
			if (ctxError) {
				console.error('[hooks] get_my_access_context failed:', ctxError.message);
			}
			const ctx = firstAccessContextRow(ctxRows);
			event.locals.scopes = ctx?.scopes ?? [];
			event.locals.homeScope = ctx?.home_scope ?? null;
			event.locals.homeRegion = ctx?.home_region ?? null;
			event.locals.accessExpiresAt = ctx?.access_expires_at ?? null;

			// Access gate: expired guests go to /access-ended
			if (
				event.locals.accessExpiresAt &&
				new Date(event.locals.accessExpiresAt).getTime() < Date.now()
			) {
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'access_ended' }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, { status: 302, headers: { Location: '/access-ended' } });
			}

			try { await event.locals.supabase.rpc('advance_scheduled_meetings'); } catch { /* fail open */ }

			const { SupabaseGateService } = await import('$lib/services/gate.js');
			const gateService = new SupabaseGateService(event.locals.supabase);
			const gateStatus = await gateService.checkGate(user.id);

			if (gateStatus.gated && gateStatus.kind === 'one_on_one') {
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'gated', kind: gateStatus.kind, formId: gateStatus.formId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				(event.locals as any).pendingFeedbackFormId = gateStatus.formId;
			} else if (gateStatus.gated && gateStatus.kind === 'group') {
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'gated', kind: gateStatus.kind, formId: gateStatus.formId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 302,
					headers: { Location: `/feedback/group/${gateStatus.formId}` }
				});
			}
		}
	}

	return resolve(event);
};
