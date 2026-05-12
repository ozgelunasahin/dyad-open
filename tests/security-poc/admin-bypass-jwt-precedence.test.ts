/**
 * Acceptance test — Finding 2: JWT-vs-header precedence.
 *
 * Pre-fix shape (committed 2026-05-12): documented that `resolveAdminOperator`
 * trusted the email header without ever consulting the JWT when both were
 * present — making a forged header authoritative over a real JWT.
 *
 * Post-fix shape (this file): asserts the inverted precedence —
 *   1. JWT present + verifies → admit the JWT-claimed identity.
 *   2. JWT present + fails → reject, regardless of any email header.
 *   3. JWT absent + header present → fall back to header trust (and log).
 *
 * The PoC's pre-fix assertions are removed — this file is now the durable
 * regression test for the protection rather than a snapshot of the
 * vulnerability.
 *
 * Run via the standalone vitest config:
 *   npx vitest run --config tests/security-poc/vitest.config.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveAdminOperator, type JwtVerifier } from '../../src/lib/server/admin-auth.js';

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
	vi.restoreAllMocks();
});

const PROD_FLAGS = { devMode: false, bypassEnabled: false } as const;

function makeRequest(headers: Record<string, string> = {}): Request {
	const h = new Headers();
	for (const [k, v] of Object.entries(headers)) h.set(k, v);
	return new Request('https://admin.dyad.berlin/admin/members', { headers: h });
}

const rejectingJwtVerifier: JwtVerifier = async () => null;
const honestJwtVerifier: JwtVerifier = async () => ({
	email: 'real-operator@dyad.berlin'
});

describe('PoC #2 — JWT-first precedence (regression test)', () => {
	it('rejects when JWT is present but fails verification, even with a header set', async () => {
		// The vulnerable shape (pre-fix) admitted the header verbatim and
		// never called the verifier. After fix: the cryptographic artefact
		// is authoritative; the failing JWT rejects the request.
		const verifier = vi.fn(rejectingJwtVerifier);
		const request = makeRequest({
			'cf-access-authenticated-user-email': 'attacker@example.com',
			'cf-access-jwt-assertion': 'tampered.jwt.value'
		});

		const operator = await resolveAdminOperator(request, {
			...PROD_FLAGS,
			verifyJwt: verifier
		});

		expect(operator).toBeNull();
		expect(verifier).toHaveBeenCalledWith('tampered.jwt.value');
	});

	it('uses the JWT identity when verification succeeds, ignoring a disagreeing header', async () => {
		const verifier = vi.fn(honestJwtVerifier);
		const request = makeRequest({
			'cf-access-authenticated-user-email': 'attacker@example.com',
			'cf-access-jwt-assertion': 'valid.jwt.for.someone.else'
		});

		const operator = await resolveAdminOperator(request, {
			...PROD_FLAGS,
			verifyJwt: verifier
		});

		expect(operator).toEqual({ email: 'real-operator@dyad.berlin' });
		expect(verifier).toHaveBeenCalled();
	});

	it('falls back to the header only when no JWT was emitted, and logs the fallback', async () => {
		const verifier = vi.fn(rejectingJwtVerifier);
		const errorSpy = console.error as unknown as ReturnType<typeof vi.fn>;
		errorSpy.mockClear();

		const request = makeRequest({
			'cf-access-authenticated-user-email': 'real@dyad.berlin'
		});

		const operator = await resolveAdminOperator(request, {
			...PROD_FLAGS,
			verifyJwt: verifier
		});

		expect(operator).toEqual({ email: 'real@dyad.berlin' });
		expect(verifier).not.toHaveBeenCalled();
		// The observability hook the design relies on — if this assertion
		// breaks, we have lost the only production signal for "Cloudflare is
		// no longer emitting JWTs."
		expect(errorSpy).toHaveBeenCalledWith(
			'[admin-auth] JWT absent; falling back to header trust',
			expect.objectContaining({ path: expect.any(String), at: expect.any(String) })
		);
	});
});
