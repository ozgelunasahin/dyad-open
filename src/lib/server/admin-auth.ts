import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Admin authentication via Cloudflare Access (JWT-first model).
 *
 * Production: Cloudflare Zero Trust gates `admin.dyad.berlin` at the edge.
 * Operators authenticate against Cloudflare's identity layer BEFORE the
 * request reaches dyad. Cloudflare attaches two artefacts:
 *   - Cf-Access-Jwt-Assertion              (signed JWT — authoritative)
 *   - Cf-Access-Authenticated-User-Email   (convenience header — fallback)
 *
 * The JWT is verified against Cloudflare's published JWKS and is authoritative.
 * A failing JWT rejects the request regardless of any email header. The
 * email header is only consulted when no JWT is emitted; exercising that
 * fallback path emits a structured `console.error` so operations can correlate
 * the signal against Cloudflare Access configuration changes.
 *
 * This precedence (post-2026-05-12) replaces an earlier header-first model
 * where a forged email header could override a real JWT. Routing-layer
 * protection (`src/lib/server/route-kind.ts`) additionally 404s non-canonical
 * hostnames before any of this code runs. See `SECURITY.md` for the layered
 * model and `tests/security-poc/` for the durable regression tests.
 *
 * Env vars (required in production):
 *   CF_ACCESS_TEAM_DOMAIN  e.g. dyad-berlin.cloudflareaccess.com
 *   CF_ACCESS_AUD          per-application audience tag from the Access dashboard
 *
 * Local dev: Cloudflare Access doesn't run locally. Set ADMIN_DEV_BYPASS=1 in
 * .env.local to allow /admin/* through with a synthetic operator.
 */

export interface AdminOperator {
	email: string;
}

export type JwtVerifier = (jwt: string) => Promise<{ email: string } | null>;

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(teamDomain: string) {
	if (!_jwks) {
		_jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
	}
	return _jwks;
}

const productionJwtVerifier: JwtVerifier = async (jwt) => {
	const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
	const audience = env.CF_ACCESS_AUD;
	if (!teamDomain || !audience) {
		console.error('[admin-auth] CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_AUD not configured');
		return null;
	}
	try {
		const { payload } = await jwtVerify(jwt, getJwks(teamDomain), {
			issuer: `https://${teamDomain}`,
			audience
		});
		return extractEmail(payload);
	} catch (error) {
		console.error('[admin-auth] JWT verification failed', error);
		return null;
	}
};

function extractEmail(payload: JWTPayload): { email: string } | null {
	const email = payload.email;
	if (typeof email === 'string' && email.length > 0) return { email };
	return null;
}

/**
 * Returns the authenticated admin operator for this request, or null if the
 * request is not authorized for the admin plane.
 */
export async function getAuthorizedAdminOperator(request: Request): Promise<AdminOperator | null> {
	return resolveAdminOperator(request, {
		devMode: dev,
		bypassEnabled: env.ADMIN_DEV_BYPASS === '1',
		verifyJwt: productionJwtVerifier
	});
}

/**
 * Pure variant: takes the dev/bypass flags and JWT verifier as parameters.
 * Used by getAuthorizedAdminOperator with real values, and by tests with
 * controlled inputs.
 *
 * Precedence (JWT-first):
 *   1. If a `Cf-Access-Jwt-Assertion` header is present, it is authoritative.
 *      A valid JWT admits the JWT-claimed identity. A failing JWT rejects
 *      the request, even if an email header is also present — the
 *      cryptographic artefact always wins over the convenience artefact.
 *   2. If no JWT is emitted, fall back to the `Cf-Access-Authenticated-User-Email`
 *      header. In a correctly configured Cloudflare Access deployment, both
 *      artefacts are emitted on every request; the fallback exists to cover
 *      legitimate edge cases where the JWT is unexpectedly stripped (and
 *      its use is logged as a misconfiguration signal — see below).
 *   3. Dev bypass applies only when devMode AND bypassEnabled are both true.
 *
 * This precedence (combined with the canonical-hostname allowlist in
 * `src/lib/server/route-kind.ts`) is the post-2026-05-12 protection model.
 * The header-only-trust precedent — and its inversion under header forgery
 * — is documented in `tests/security-poc/admin-bypass-jwt-precedence.test.ts`.
 */
export async function resolveAdminOperator(
	request: Request,
	flags: {
		devMode: boolean;
		bypassEnabled: boolean;
		verifyJwt?: JwtVerifier;
	}
): Promise<AdminOperator | null> {
	const jwtHeader = request.headers.get('cf-access-jwt-assertion');
	if (jwtHeader !== null) {
		// Treat header *presence* as "JWT emitted by the edge" — even an
		// empty value. A proxy that strips the value but not the name must
		// not be allowed to silently fall through to the email header. The
		// only way to reach the header-fallback path is for the JWT header
		// to be absent entirely.
		if (jwtHeader.length === 0) return null;
		if (!flags.verifyJwt) {
			// Verifier not wired (env-config missing). Reject rather than
			// silently fall through to the header — a JWT was emitted and we
			// cannot verify it.
			return null;
		}
		const claims = await flags.verifyJwt(jwtHeader);
		return claims ?? null;
	}

	const headerEmail = request.headers.get('cf-access-authenticated-user-email');
	if (headerEmail && headerEmail.length > 0) {
		// Header-only path: Cloudflare Access normally emits both artefacts.
		// Exercising this branch in production is a misconfiguration signal
		// — log it as an error so operations can correlate against Cloudflare
		// config changes. (CLAUDE.md mandates `console.error` for operational
		// signals in server code — not `console.log` or `console.warn`.)
		console.error('[admin-auth] JWT absent; falling back to header trust', {
			path: new URL(request.url).pathname,
			at: new Date().toISOString()
		});
		return { email: headerEmail };
	}

	if (flags.devMode && flags.bypassEnabled) {
		return { email: 'dev@localhost' };
	}

	return null;
}
