import { env } from '$env/dynamic/private';

/**
 * HTTP Basic Auth check for the admin plane.
 *
 * Admin identity is intentionally separate from user identity — see
 * docs/solutions/identity-decoupling-security-tradeoffs.md. The admin plane
 * has zero overlap with user auth: the user app routes the request through
 * upact (locals.user, locals.identityPort), this helper does not.
 *
 * Returns null when valid credentials are present (caller proceeds).
 * Returns a 401 Response with WWW-Authenticate header otherwise (caller
 * should return that response directly).
 *
 * Environment variables (both required; throws if either is unset):
 *   ADMIN_USERNAME — admin operator username
 *   ADMIN_PASSWORD — admin operator password
 *
 * To replace this with GitHub OAuth, OIDC SSO, or another mechanism, change
 * only this file. The admin layout and admin pages remain unchanged.
 */
export function requireAdminAuth(request: Request): Response | null {
	const expectedUser = env.ADMIN_USERNAME;
	const expectedPass = env.ADMIN_PASSWORD;
	if (!expectedUser || !expectedPass) {
		throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set for the admin plane');
	}
	return verifyBasicAuth(request, expectedUser, expectedPass);
}

/**
 * Pure-function variant for testing — no env dependency. Takes the expected
 * credentials directly. The exported requireAdminAuth wraps this with env
 * reading + fail-closed validation.
 */
export function verifyBasicAuth(
	request: Request,
	expectedUser: string,
	expectedPass: string
): Response | null {
	const header = request.headers.get('authorization');
	if (!header || !header.startsWith('Basic ')) {
		return unauthorized();
	}

	let decoded: string;
	try {
		decoded = atob(header.slice(6));
	} catch {
		return unauthorized();
	}

	const sep = decoded.indexOf(':');
	if (sep < 0) {
		return unauthorized();
	}

	const providedUser = decoded.slice(0, sep);
	const providedPass = decoded.slice(sep + 1);

	if (!timingSafeEqual(providedUser, expectedUser) || !timingSafeEqual(providedPass, expectedPass)) {
		return unauthorized();
	}

	return null;
}

function unauthorized(): Response {
	return new Response('Authentication required', {
		status: 401,
		headers: {
			'WWW-Authenticate': 'Basic realm="Admin", charset="UTF-8"'
		}
	});
}

/**
 * Constant-time string comparison. Returns true iff the two strings are equal.
 * Compares character by character to a fixed length to avoid revealing match
 * progress through timing.
 */
function timingSafeEqual(a: string, b: string): boolean {
	const len = Math.max(a.length, b.length);
	let mismatch = a.length !== b.length ? 1 : 0;
	for (let i = 0; i < len; i++) {
		mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
	}
	return mismatch === 0;
}
