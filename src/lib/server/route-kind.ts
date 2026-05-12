/**
 * Pure routing decision for the `handle` chain.
 *
 * Classifies an inbound request URL by hostname and path into one of four
 * outcomes:
 *
 *   - `'apex-redirect'` — request hit the apex hostname with an `/admin/*`
 *     path; should be 301'd to the admin hostname (backwards compatibility
 *     for old bookmarks).
 *   - `'admin'` — admin plane; gated by `getAuthorizedAdminOperator`.
 *   - `'user'` — normal user-tier request.
 *   - `'reject'` — hostname is not a canonical deployment of this app;
 *     the application has nothing to say (caller should 404).
 *
 * The `'reject'` outcome is the load-bearing protection against the
 * non-canonical-hostname admin bypass demonstrated in
 * `tests/security-poc/admin-bypass-hostname.test.ts`. The admin gate's
 * trust contract (Cloudflare Access header verification) collapses on any
 * hostname not enrolled in the same Access application, so requests to
 * non-canonical hostnames cannot be safely admitted to the admin plane.
 *
 * Pages preview hostnames (`*.<project>.pages.dev`) are admitted for
 * non-admin paths only — they exist to preserve the preview-deployment
 * review workflow. Admin paths on preview hostnames always reject.
 *
 * Pure function: depends only on the URL and the options object. Imported
 * by both `src/hooks.server.ts` (production) and
 * `tests/security-poc/admin-bypass-hostname.test.ts` (acceptance criteria
 * for this protection).
 */
export type RouteKind = 'admin' | 'apex-redirect' | 'user' | 'reject';

export interface RouteKindOptions {
	devMode: boolean;
	apexHostname: string;
	adminHostname: string;
	/**
	 * Project's canonical Cloudflare Pages hostname, e.g. `'dyad-berlin.pages.dev'`.
	 * Matches both the project root (`dyad-berlin.pages.dev`) and preview
	 * subdomains (`<branch-or-hash>.dyad-berlin.pages.dev`) for non-admin
	 * paths only. Empty string disables preview admission entirely (canonical
	 * hostnames only).
	 *
	 * Scoping to the project hostname (rather than a generic `.pages.dev`)
	 * prevents Pages projects owned by other Cloudflare accounts from being
	 * admitted by this allowlist.
	 */
	previewHostname: string;
}

export function routeKind(url: URL, opts: RouteKindOptions): RouteKind {
	// Strip trailing FQDN dot: `new URL('https://admin.dyad.berlin./').hostname`
	// preserves the dot, which would fail the strict-equality checks below and
	// 404 legitimate canonical traffic. Cloudflare's edge normalizes this in
	// practice; direct-origin paths may not.
	const hostname = url.hostname.replace(/\.$/, '');
	const isAdminPath = url.pathname.startsWith('/admin');

	if (hostname === opts.apexHostname) {
		return isAdminPath ? 'apex-redirect' : 'user';
	}

	if (hostname === opts.adminHostname) {
		return 'admin';
	}

	if (opts.devMode && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')) {
		return isAdminPath ? 'admin' : 'user';
	}

	if (opts.previewHostname.length > 0 && isPreviewHost(hostname, opts.previewHostname)) {
		return isAdminPath ? 'reject' : 'user';
	}

	return 'reject';
}

function isPreviewHost(hostname: string, previewHostname: string): boolean {
	return hostname === previewHostname || hostname.endsWith('.' + previewHostname);
}
