/**
 * Regression test for JWT-vs-header precedence (Finding 2). See
 * `tests/security-poc/README.md` for context. Runs via the standalone
 * vitest config in this directory.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { resolveAdminOperator, type JwtVerifier } from '../../src/lib/server/admin-auth.js';

let errorSpy: MockInstance<typeof console.error>;
beforeEach(() => {
	errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
		expect(errorSpy).toHaveBeenCalledWith(
			'[admin-auth] JWT absent; falling back to header trust',
			expect.objectContaining({ path: expect.any(String), at: expect.any(String) })
		);
	});
});
