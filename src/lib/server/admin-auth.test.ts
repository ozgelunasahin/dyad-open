import { describe, it, expect } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { isAdminAuthorized } from './admin-auth.js';

function user(overrides: Partial<User> = {}): User {
	return {
		id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		aud: 'authenticated',
		email: 'a@b.c',
		app_metadata: {},
		user_metadata: {},
		created_at: '2026-01-01T00:00:00Z',
		...overrides
	} as User;
}

describe('isAdminAuthorized', () => {
	it('returns true when app_metadata.admin_authorized is the boolean true', () => {
		expect(isAdminAuthorized(user({ app_metadata: { admin_authorized: true } }))).toBe(true);
	});

	it('returns false when admin_authorized is missing', () => {
		expect(isAdminAuthorized(user({ app_metadata: {} }))).toBe(false);
	});

	it('returns false when admin_authorized is false', () => {
		expect(isAdminAuthorized(user({ app_metadata: { admin_authorized: false } }))).toBe(false);
	});

	it('returns false when admin_authorized is the string "true" (truthy but not boolean)', () => {
		// Strict boolean check — string truthiness must not pass.
		expect(isAdminAuthorized(user({ app_metadata: { admin_authorized: 'true' } as never }))).toBe(false);
	});

	it('returns false when app_metadata is missing entirely', () => {
		expect(isAdminAuthorized(user({ app_metadata: undefined as never }))).toBe(false);
	});

	it('ignores user_metadata even when it claims admin (only app_metadata is trusted)', () => {
		// app_metadata is set by the Admin API (immutable from client side).
		// user_metadata is editable by the user — must not grant admin.
		expect(
			isAdminAuthorized(
				user({
					app_metadata: {},
					user_metadata: { admin_authorized: true }
				})
			)
		).toBe(false);
	});
});
