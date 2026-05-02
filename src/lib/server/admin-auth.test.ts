import { describe, it, expect } from 'vitest';
import { verifyBasicAuth } from './admin-auth.js';

const VALID_USER = 'admin';
const VALID_PASS = 'correct-horse-battery-staple';

function makeRequest(authHeader?: string): Request {
	const headers = new Headers();
	if (authHeader !== undefined) headers.set('authorization', authHeader);
	return new Request('http://localhost/admin', { headers });
}

function basicAuth(user: string, pass: string): string {
	return `Basic ${btoa(`${user}:${pass}`)}`;
}

describe('verifyBasicAuth', () => {
	it('returns null for valid credentials', () => {
		const result = verifyBasicAuth(makeRequest(basicAuth(VALID_USER, VALID_PASS)), VALID_USER, VALID_PASS);
		expect(result).toBeNull();
	});

	it('returns 401 with WWW-Authenticate when authorization header is missing', () => {
		const result = verifyBasicAuth(makeRequest(), VALID_USER, VALID_PASS);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
		expect(result!.headers.get('www-authenticate')).toContain('Basic');
		expect(result!.headers.get('www-authenticate')).toContain('realm');
	});

	it('returns 401 for non-Basic authorization scheme', () => {
		const result = verifyBasicAuth(makeRequest('Bearer some-token'), VALID_USER, VALID_PASS);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
	});

	it('returns 401 for malformed base64', () => {
		const result = verifyBasicAuth(makeRequest('Basic !!!not-base64!!!'), VALID_USER, VALID_PASS);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
	});

	it('returns 401 for missing colon separator', () => {
		const noColon = `Basic ${btoa('admincorrect-horse')}`;
		const result = verifyBasicAuth(makeRequest(noColon), VALID_USER, VALID_PASS);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
	});

	it('returns 401 for wrong username', () => {
		const result = verifyBasicAuth(makeRequest(basicAuth('attacker', VALID_PASS)), VALID_USER, VALID_PASS);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
	});

	it('returns 401 for wrong password', () => {
		const result = verifyBasicAuth(makeRequest(basicAuth(VALID_USER, 'wrong')), VALID_USER, VALID_PASS);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
	});

	it('returns 401 for empty credentials', () => {
		const result = verifyBasicAuth(makeRequest(basicAuth('', '')), VALID_USER, VALID_PASS);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
	});

	it('handles credentials containing colons (only first colon is the separator)', () => {
		const passWithColon = 'pass:with:colons';
		const result = verifyBasicAuth(
			makeRequest(basicAuth(VALID_USER, passWithColon)),
			VALID_USER,
			passWithColon
		);
		expect(result).toBeNull();
	});
});
