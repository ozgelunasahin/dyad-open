/**
 * Classifies an inbound request URL by hostname and path. `'reject'` is the
 * load-bearing protection against admin admission on non-canonical hostnames
 * — see SECURITY.md and `tests/security-poc/admin-bypass-hostname.test.ts`.
 */
export type RouteKind = 'admin' | 'apex-redirect' | 'user' | 'reject' | 'alias-redirect';

export interface RouteKindOptions {
	devMode: boolean;
	apexHostname: string;
	adminHostname: string;
	/**
	 * Project's canonical Pages hostname (e.g. `dyad-berlin.pages.dev`).
	 * Matches root and `*.<previewHostname>` for non-admin paths. Scoped to
	 * the project so other-account Pages projects can't slip in. Empty
	 * string disables preview admission entirely.
	 */
	previewHostname: string;
	/**
	 * Additional user-plane hostnames that serve the app itself (e.g.
	 * `dyad.amsterdam` for conference guests). `/admin` paths on these hosts
	 * redirect to the canonical admin host exactly like the apex — the admin
	 * plane is never served from a non-canonical hostname (SECURITY.md).
	 * Optional; defaults to none.
	 */
	secondaryApexHostnames?: readonly string[];
	/**
	 * Hostnames that 302 to a canonical host (e.g. `www.dyad.amsterdam` →
	 * `dyad.amsterdam`), path preserved. Every path redirects — including
	 * `/admin`. Optional; defaults to none.
	 */
	aliasHostnames?: readonly string[];
}

export function routeKind(url: URL, opts: RouteKindOptions): RouteKind {
	// Strip trailing FQDN dot; Node URL preserves it.
	const hostname = url.hostname.replace(/\.$/, '');
	const isAdminPath = url.pathname.startsWith('/admin');

	if (hostname === opts.apexHostname) {
		return isAdminPath ? 'apex-redirect' : 'user';
	}

	if (hostname === opts.adminHostname) {
		return 'admin';
	}

	if (opts.secondaryApexHostnames?.includes(hostname)) {
		return isAdminPath ? 'apex-redirect' : 'user';
	}

	if (opts.aliasHostnames?.includes(hostname)) {
		return 'alias-redirect';
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
