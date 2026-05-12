import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Admin authentication via Cloudflare Access.
 *
 * Production: Cloudflare Zero Trust gates `admin.dyad.berlin` at the edge.
 * Operators authenticate against Cloudflare's identity layer BEFORE the
 * request reaches dyad. Cloudflare attaches two artefacts:
 *   - Cf-Access-Authenticated-User-Email   (convenience header)
 *   - Cf-Access-Jwt-Assertion              (signed JWT)
 *
 * The email header is trusted because the only path to the origin is
 * through Cloudflare Access. We read it first; the JWT verification path
 * is a fallback that fires when the header is missing. If the origin ever
 * becomes reachable directly — a different deployment target, or the
 * underlying *.pages.dev URL not gated by CF Access — the header is
 * spoofable and the precedence would need to invert (JWT first). See
 * SECURITY.md for the deployment assumption this code relies on.
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
 */
export async function resolveAdminOperator(
	request: Request,
	flags: {
		devMode: boolean;
		bypassEnabled: boolean;
		verifyJwt?: JwtVerifier;
	}
): Promise<AdminOperator | null> {
	const headerEmail = request.headers.get('cf-access-authenticated-user-email');
	if (headerEmail && headerEmail.length > 0) {
		return { email: headerEmail };
	}

	const jwt = request.headers.get('cf-access-jwt-assertion');
	if (jwt && flags.verifyJwt) {
		const claims = await flags.verifyJwt(jwt);
		if (claims) return claims;
	}

	if (flags.devMode && flags.bypassEnabled) {
		return { email: 'dev@localhost' };
	}

	return null;
}
