// The Workers runtime may not expose WeakRef/FinalizationRegistry (they are
// compatibility-flag-gated). undici — pulled in through the atproto identity
// module on every request — constructs a WeakRef at module init, which made
// the FIRST request on each fresh isolate 500 (intermittent production
// errors, one per cold start). Strong-reference fallbacks are safe here:
// undici only uses them for GC bookkeeping, and an isolate's lifetime is
// short. Must run before any dynamic import that reaches undici.
if (typeof globalThis.WeakRef === 'undefined') {
	// @ts-expect-error runtime polyfill for a possibly-absent global
	globalThis.WeakRef = class WeakRefPolyfill<T extends object> {
		#value: T;
		constructor(value: T) {
			this.#value = value;
		}
		deref(): T {
			return this.#value;
		}
	};
}
if (typeof globalThis.FinalizationRegistry === 'undefined') {
	// @ts-expect-error runtime polyfill for a possibly-absent global
	globalThis.FinalizationRegistry = class FinalizationRegistryPolyfill {
		register() {}
		unregister() {
			return false;
		}
	};
}
if (typeof globalThis.MessagePort === 'undefined') {
	// undici's webidl layer only references MessagePort to build an
	// instanceof type assertion — a bare class satisfies it.
	// @ts-expect-error runtime polyfill for a possibly-absent global
	globalThis.MessagePort = class MessagePortPolyfill {};
}

import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { createSupabaseAdapter } from '@prefig/upact-supabase';
import { getAuthorizedAdminOperator } from '$lib/server/admin-auth';
import { routeKind } from '$lib/server/route-kind';
import { aliasRedirect } from '$lib/server/alias-redirect';
import { firstAccessContextRow } from '$lib/server/access-context';

const ADMIN_HOSTNAME = 'admin.dyad.berlin';
// dyad.social is the primary host — the canonical URL of the app. The old
// Berlin apex is now an alias (see ALIAS_TARGETS below).
const APEX_HOSTNAME = 'dyad.social';
// The production Pages project's subdomain (previews deploy as
// <branch>.dyad-25o.pages.dev). The old dyad-berlin.pages.dev project no
// longer exists — with the stale value here the app rejected its own
// preview deploys.
const PAGES_PREVIEW_HOSTNAME = 'dyad-25o.pages.dev';
// Conference host: dyad.amsterdam serves the app itself (attach the domain
// — and www — to the Pages project). Sessions are host-scoped cookies, so
// guests who join there live their whole corner experience under this
// hostname. Joining still requires a generated group link — the QR encodes
// the full join URL (https://dyad.amsterdam/join?glink=<token>); an
// anonymous visitor on the bare domain is redirected to the primary apex,
// so possession of the link is the gate.
const AMSTERDAM_HOSTNAME = 'dyad.amsterdam';
const SECONDARY_APEX_HOSTNAMES = [AMSTERDAM_HOSTNAME];
// Alias hosts 301 onto their canonical host, path preserved. dyad.berlin
// (the former apex) now canonicalizes onto dyad.social alongside both www
// hosts — links to old URLs keep working, path and query intact.
const ALIAS_TARGETS: Record<string, string> = {
	'dyad.berlin': APEX_HOSTNAME,
	'www.dyad.berlin': APEX_HOSTNAME,
	'www.dyad.social': APEX_HOSTNAME
};
const ALIAS_HOSTNAMES = Object.keys(ALIAS_TARGETS);

// Retired public routes and where they now live. Add a line here instead of
// letting a removed route 404 — see the redirect in handle() below.
const RETIRED_PATHS: Record<string, string> = {
	// The About page; its content folded into the reel page (e8109a81, deleted b3d93d9e).
	'/why': '/wiggling',
	// /community and /voices were the two earlier homes of the Wiggling reels;
	// consolidated onto /wiggling. Keep both redirecting so old links survive.
	'/community': '/wiggling',
	'/voices': '/wiggling'
};

// Region a hostname puts a signed-in member into. A multi-region member
// (grants in several corners across cities) browsing dyad.amsterdam should
// see the Amsterdam region — its commons plus the Amsterdam corners they
// hold — not the Berlin default. Region keys index the registry in
// location.ts. Hosts absent here use the default region.
const HOST_REGIONS: Record<string, string> = {
	[AMSTERDAM_HOSTNAME]: 'amsterdam'
};

export const handle: Handle = async ({ event, resolve }) => {
	// E2E_LOOPBACK admits localhost when running production builds (`vite preview`)
	// for Playwright integration. Distinct from ADMIN_DEV_BYPASS so the two
	// concerns can't be conflated by a single env var leak.
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

	// Alias hosts canonicalize onto their target host, path preserved. Status,
	// Location, and the Stripe exemption live in $lib/server/alias-redirect so
	// they are unit-testable; aliasRedirect returns null when the request must
	// be served on the host it arrived at.
	if (kind === 'alias-redirect') {
		const target = ALIAS_TARGETS[event.url.hostname.replace(/\.$/, '')] ?? APEX_HOSTNAME;
		const redirect = aliasRedirect(event.url, target, event.request.method);
		if (redirect) return redirect;
	}

	// Backwards compat: old apex /admin/* bookmarks redirect to the admin host.
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

	// Referral capture: any user-plane URL can carry ?ref=<username> (a member's
	// share link — profile or conversation). Persisted as the dyad_ref cookie
	// that /signup and /join read server-side, so the referral survives
	// navigation and login redirects. Disclosed in /datenschutz.
	const refParam = event.url.searchParams.get('ref');
	if (refParam && /^[a-z0-9_-]{2,32}$/i.test(refParam)) {
		event.cookies.set('dyad_ref', refParam.toLowerCase(), {
			path: '/',
			maxAge: 60 * 60 * 24 * 30,
			httpOnly: false,
			sameSite: 'lax',
			secure: !dev
		});
		// The username must never reach the analytics tracker: `ref` is one of
		// Plausible's acquisition parameters, so a ?ref=<username> URL would be
		// stored at Plausible as the traffic source — a per-person identifier
		// held by a third party (the exact leak class that retired PostHog).
		// Strip it and 302 to the clean URL; Set-Cookie rides the redirect, so
		// the referral survives for the /signup and /join readers.
		if (event.request.method === 'GET') {
			const clean = new URL(event.url);
			clean.searchParams.delete('ref');
			return new Response(null, {
				status: 302,
				headers: { Location: clean.pathname + clean.search }
			});
		}
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

	event.locals.homeScope = null;
	event.locals.homeRegion = null;
	event.locals.accessExpiresAt = null;
	// Host-derived region (null = default/berlin). Available without a session
	// — it's purely the hostname — so loaders can switch a member's region
	// context to match the domain they arrived on.
	event.locals.hostRegion = HOST_REGIONS[event.url.hostname.replace(/\.$/, '')] ?? null;

	// Ephemeral scope sessions from any configured identity provider (additive;
	// no-op unless a provider is configured and a valid credential cookie is
	// present). Substrate-agnostic: dyad core names no substrate here. Sessions
	// lapse with their credential and are stored in no identity_scopes row.
	// See src/lib/server/identity.
	const { loadScopeSessions, resolvePrincipal } = await import('$lib/server/identity/index.js');
	const ephemeral = await loadScopeSessions(event.cookies, Math.floor(Date.now() / 1000));
	event.locals.scopes = [...ephemeral.scopes];
	event.locals.scopeSessions = ephemeral.sessions;
	event.locals.upactor = null;

	// One resolution, whatever the substrate: Supabase Auth is substrate zero,
	// registry providers follow, first match wins. Everything downstream —
	// locals.user, the access and feedback gates, services — keys on the
	// resolved principal and never asks which substrate produced it. A
	// Supabase principal keeps its native client and JWT; a provider principal
	// runs on a claim-injected client (RLS sees its identity + scopes).
	const resolved = await resolvePrincipal(event, ephemeral.sessions);
	event.locals.session = resolved?.session ?? null;
	event.locals.user = resolved?.principal.user ?? null;
	if (resolved) {
		event.locals.supabase = resolved.principal.client;
		event.locals.upactor = resolved.principal.upactor;

		// Admission is not joining. On substrates that defer account creation,
		// an invited identity holds a session before any profiles row exists;
		// the app stays closed until they create an account at /welcome. This
		// is the one place a profile-less authenticated request can exist —
		// atomic-account substrates (Supabase, via the handle_new_user trigger)
		// never enter — so enforcing it here keeps the app-wide invariant that
		// authenticated implies a profile, including for /api mutations.
		if (resolved.principal.deferredAccount) {
			const path = event.url.pathname;
			const exempt =
				path === '/welcome' ||
				path.startsWith('/auth') ||
				path.startsWith('/logout') ||
				path.startsWith('/_app/') ||
				path.startsWith('/service-worker') ||
				path.startsWith('/favicon') ||
				path.endsWith('.webmanifest');
			if (!exempt) {
				const { data: profile } = await resolved.principal.client
					.from('profiles')
					.select('id')
					.eq('id', resolved.principal.user.id)
					.maybeSingle();
				if (!profile) {
					if (path.startsWith('/api/')) {
						return new Response(JSON.stringify({ error: 'onboarding_required' }), {
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					return new Response(null, { status: 302, headers: { Location: '/welcome' } });
				}
			}
		}
	}

	// Redirect old /prompts/ URLs to /conversations/
	if (event.url.pathname.startsWith('/prompts/')) {
		const newPath = event.url.pathname.replace('/prompts/', '/conversations/') + event.url.search;
		return new Response(null, { status: 302, headers: { Location: newPath } });
	}

	// Retired public routes 302 to their successor — a public route is never
	// deleted outright, because external links (search results, printed
	// material, old footers) outlive it. /why still drew real traffic days
	// after its deletion in b3d93d9e. One line here per retirement.
	const retired = RETIRED_PATHS[event.url.pathname];
	if (retired) {
		return new Response(null, { status: 302, headers: { Location: retired + event.url.search } });
	}

	// An anonymous visitor on the conference host's bare domain has nothing
	// to do there — without a join link, dyad.amsterdam redirects to the
	// primary apex. Signed-in guests (!resolved guard) and the QR's
	// /join?glink=... path are unaffected.
	if (
		!resolved &&
		event.url.pathname === '/' &&
		event.url.hostname.replace(/\.$/, '') === AMSTERDAM_HOSTNAME
	) {
		return new Response(null, {
			status: 302,
			headers: { Location: `https://${APEX_HOSTNAME}/` }
		});
	}

	// Feedback gate: block app access when the member has due feedback. Keys on
	// the resolved principal, so provider identities pass the same access and
	// feedback gates as Supabase members.
	if (resolved) {
		const pathname = event.url.pathname;

		// Exemption list — load-bearing for THREE concerns that all live in the
		// non-exempt block below: (1) the per-request context/scope query,
		// (2) the access gate (expired guests), (3) the feedback gate. A path
		// listed here skips all three. When adding a path, consider each
		// concern: an expired guest must always be able to reach auth routes
		// (/auth, /api/auth, /logout), the legal pages, the access-ended page
		// itself, and static assets — otherwise they cannot even log out or
		// read the privacy policy.
		const isExempt =
			pathname.startsWith('/_app/') ||
			pathname.startsWith('/feedback') ||
			pathname.startsWith('/api/feedback') ||
			pathname.startsWith('/api/auth') ||
			pathname.startsWith('/api/vocabulary') ||
			pathname.startsWith('/api/onboarding') ||
			// A member behind a pending feedback form must still be able to pay /
			// manage membership; membership gating is per-action, not a wall here.
			pathname.startsWith('/api/membership') ||
			pathname.startsWith('/auth') ||
			pathname.startsWith('/logout') ||
			pathname.startsWith('/access-ended') ||
			pathname.endsWith('.webmanifest') ||
			pathname.startsWith('/service-worker') ||
			pathname.startsWith('/favicon') ||
			pathname.startsWith('/impressum') ||
			pathname.startsWith('/datenschutz') ||
			pathname.startsWith('/agb') ||
			// The consolidated legal page — every footer links here now, so an
			// expired guest must be able to reach it just like the three legacy
			// legal routes above.
			pathname.startsWith('/legal');

		if (!isExempt) {
			// Load the access context once per request: active scope memberships
			// (non-revoked, non-retired), the guest access window, and the home
			// corner + region. One SECURITY DEFINER round trip replaces the raw
			// identity_scopes select — see migration 20260605100400. The
			// discover-feed query and the public profile query in prompt-query.ts
			// read locals.scopes/homeScope to gate scoped prompts.
			const { data: ctxRows, error: ctxError } = await event.locals.supabase.rpc(
				'get_my_access_context'
			);
			if (ctxError) {
				// Fail open, consistent with the feedback gate and the meeting
				// advancement below: a transient DB error must not lock every
				// member out. The cost is one request where an expired guest
				// passes the gate and a corner member sees commons defaults —
				// logged so repeated failures are visible in log tailing.
				console.error('[hooks] get_my_access_context failed:', ctxError.message);
			}
			const ctx = firstAccessContextRow(ctxRows);
			// Merge permanent grants with any ephemeral provider scope sessions.
			event.locals.scopes = [...new Set([...(ctx?.scopes ?? []), ...ephemeral.scopes])];
			event.locals.homeScope = ctx?.home_scope ?? null;
			event.locals.homeRegion = ctx?.home_region ?? null;
			event.locals.accessExpiresAt = ctx?.access_expires_at ?? null;

			// Access gate: a guest whose window has ended is blocked before any
			// further work — no meeting advancement, no feedback gates. Page
			// navigations land on /access-ended (exempt above, so it stays
			// reachable); API calls get the same two-shape treatment as the
			// feedback gate. See migration 20260605100200 and plan R10/R11.
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
				return new Response(null, {
					status: 302,
					headers: { Location: '/access-ended' }
				});
			}

			// Advance any meetings whose scheduled_time has passed — creates feedback_forms with state='due'.
			// Pre-existing posture note: this RPC is invoked on the request-scoped
			// client; its grants govern what it may do. Left untouched here — the
			// access gate above simply ensures expired guests never trigger it.
			try { await event.locals.supabase.rpc('advance_scheduled_meetings'); } catch { /* fail open */ }

			const { SupabaseGateService } = await import('$lib/services/gate.js');
			const gateService = new SupabaseGateService(event.locals.supabase);
			const { getGatheringFeedbackGateEnabled } = await import('$lib/server/app-settings.js');
			// The U9 gathering obligation ships live for the group flow; the flag
			// (app_settings, default + fail-safe TRUE) lets an operator roll back to
			// legacy behaviour without a migration.
			const gatheringGateEnabled = await getGatheringFeedbackGateEnabled();
			const gateStatus = await gateService.checkGate(
				resolved.principal.user.id,
				gatheringGateEnabled
			);

			if (gateStatus.gated && gateStatus.kind === 'one_on_one') {
				if (pathname.startsWith('/api/')) {
					// Body mirrors the GateStatus discriminated union ({kind, formId}) so
					// programmatic callers handle both gate kinds with one shape.
					return new Response(JSON.stringify({ error: 'gated', kind: gateStatus.kind, formId: gateStatus.formId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				// Store in locals so the layout renders the feedback modal instead of redirecting
				(event.locals as any).pendingFeedbackFormId = gateStatus.formId;
			} else if (gateStatus.gated && gateStatus.kind === 'group') {
				// Group feedback (R5/U11): one simple group-level form per gathering.
				// Routed to a dedicated /feedback/group/[id] page (which is gate-exempt
				// under the /feedback prefix). Unlike the one-on-one modal path, this
				// redirects — the group form is a standalone page with no reveal state.
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
			} else if (gateStatus.gated && gateStatus.kind === 'gathering') {
				// U9 unified gathering obligation: confirming attendance (R10) on a
				// group gathering. formId is the GATHERING id. Routed to the new-model
				// form at /feedback/gathering/[id] (gate-exempt under /feedback), a
				// standalone-page redirect like the group path. NOTE: the U6 form page
				// ships on this same branch to fill this route; until it lands the
				// redirect targets a not-yet-built page (harmless — /feedback is exempt,
				// so no gate loop).
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'gated', kind: gateStatus.kind, formId: gateStatus.formId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 302,
					headers: { Location: `/feedback/gathering/${gateStatus.formId}` }
				});
			}
		}
	}

	return resolve(event);
};

/**
 * Cloudflare Pages retains no function logs, so without this hook an
 * unexpected server error leaves no trace anywhere — the intermittent
 * isolate-500 incident (undici's `node:assert` require, see
 * $lib/server/identity/registry.ts) took a live `wrangler pages deployment
 * tail` to even see. Log method + path + error so a tail or future log sink
 * can attribute failures; return only the generic message so nothing internal
 * reaches the client.
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	if (status !== 404) {
		console.error(
			`[handleError] ${status} ${event.request.method} ${event.url.pathname}:`,
			error
		);
	} else {
		// 404s are logged ONLY when the visitor came from one of our own pages —
		// that is the "we published a broken link" signal. Unreferred 404s are
		// overwhelmingly bot probes (wp-login.php etc.) and stay unlogged.
		const referer = event.request.headers.get('referer');
		if (referer) {
			try {
				const refHost = new URL(referer).hostname.replace(/\.$/, '');
				const ours =
					refHost === APEX_HOSTNAME ||
					refHost === ADMIN_HOSTNAME ||
					SECONDARY_APEX_HOSTNAMES.includes(refHost) ||
					ALIAS_HOSTNAMES.includes(refHost) ||
					refHost === PAGES_PREVIEW_HOSTNAME ||
					refHost.endsWith('.' + PAGES_PREVIEW_HOSTNAME);
				if (ours) {
					console.error(
						`[handleError] broken internal link: 404 ${event.url.pathname} referred from ${referer}`
					);
				}
			} catch {
				// unparseable referer — ignore
			}
		}
	}
	return { message };
};
