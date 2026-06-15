import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Admin authentication via Cloudflare Access. See SECURITY.md for the layered
 * model (routing-layer hostname allowlist + JWT-first verification here).
 *
 * Env vars (required in production):
 *   CF_ACCESS_TEAM_DOMAIN  e.g. dyad-berlin.cloudflareaccess.com
 *   CF_ACCESS_AUD          per-application audience tag
 *
 * Local dev: set ADMIN_DEV_BYPASS=1 in .env.local for a synthetic operator.
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

/**
 * Trim + non-empty check. Treats whitespace-only values as absent so a
 * copy-paste artefact like `CF_ACCESS_TEAM_DOMAIN='   '` doesn't pass the
 * configured-env check and leave the header path unguarded. Exported for
 * test access; not part of the auth contract.
 */
export function isConfigured(value: string | undefined): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

const productionJwtVerifier: JwtVerifier = async (jwt) => {
	const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
	const audience = env.CF_ACCESS_AUD;
	if (!isConfigured(teamDomain) || !isConfigured(audience)) {
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
	// Only wire the verifier when the env vars it needs are present. With env
	// missing, `verifyJwt` is undefined and both the JWT and header-fallback
	// paths in resolveAdminOperator hard-reject — admin admission requires a
	// working cryptographic check. `isConfigured` treats whitespace-only
	// values as absent (see its docstring).
	const envConfigured = isConfigured(env.CF_ACCESS_TEAM_DOMAIN) && isConfigured(env.CF_ACCESS_AUD);
	return resolveAdminOperator(request, {
		devMode: dev,
		bypassEnabled: env.ADMIN_DEV_BYPASS === '1',
		verifyJwt: envConfigured ? productionJwtVerifier : undefined
	});
}

/**
 * Pure variant. JWT-first: present JWT is authoritative (fails → reject
 * regardless of any header). Header only consulted when no JWT was emitted,
 * and the path is logged as a misconfiguration signal.
 */
export async function resolveAdminOperator(
	request: Request,
	flags: {
		devMode: boolean;
		bypassEnabled: boolean;
		verifyJwt?: JwtVerifier;
	}
): Promise<AdminOperator | null> {
	// Header *presence* (even empty value) signals "JWT was emitted" — a
	// proxy stripping the value must not enable silent header fallback.
	const jwtHeader = request.headers.get('cf-access-jwt-assertion');
	if (jwtHeader !== null) {
		if (jwtHeader.length === 0) return null;
		// Reject rather than fall through to header trust — a JWT was emitted
		// and we can't verify it. Falling through would silently regress.
		if (!flags.verifyJwt) return null;
		const claims = await flags.verifyJwt(jwtHeader);
		return claims ?? null;
	}

	const headerEmail = request.headers.get('cf-access-authenticated-user-email');
	if (headerEmail && headerEmail.length > 0) {
		// Header-fallback requires the verifier to be wired. With env vars
		// missing AND Cloudflare stopping JWT emission, the email header is
		// our only signal — and we have nothing to verify it against. Reject
		// rather than silently admit.
		if (!flags.verifyJwt) {
			console.error('[admin-auth] header-only request rejected; CF Access env not configured', {
				path: new URL(request.url).pathname,
				at: new Date().toISOString()
			});
			return null;
		}
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
