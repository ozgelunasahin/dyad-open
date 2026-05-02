import { describe, it, expect } from 'vitest';
import { requireIdentity } from './identity.js';
import type { User } from '@supabase/supabase-js';

const makeUser = (overrides: Partial<User> = {}): User =>
	({
		id: 'user-abc',
		email: 'alice@example.com',
		email_confirmed_at: '2026-01-01T00:00:00Z',
		user_metadata: {},
		app_metadata: {},
		aud: 'authenticated',
		created_at: '2026-01-01T00:00:00Z',
		...overrides
	}) as User;

const makeLocals = (user: User | null) =>
	({ user }) as unknown as App.Locals;

describe('requireIdentity', () => {
	it('returns an Upactor with the correct id', () => {
		const result = requireIdentity(makeLocals(makeUser({ id: 'user-123' })));
		expect(result.id).toBe('user-123');
	});

	it('returns an Upactor with a capabilities Set', () => {
		const result = requireIdentity(makeLocals(makeUser()));
		expect(result.capabilities).toBeInstanceOf(Set);
	});

	it('does not expose email on the returned Upactor', () => {
		const result = requireIdentity(makeLocals(makeUser({ email: 'secret@example.com' })));
		expect(result).not.toHaveProperty('email');
	});

	it('throws when user is null', () => {
		expect(() => requireIdentity(makeLocals(null))).toThrow();
	});

	it('includes display_hint when user_metadata.display_name is present and not email-shaped', () => {
		const result = requireIdentity(
			makeLocals(makeUser({ user_metadata: { display_name: 'Alice' } }))
		);
		expect(result.display_hint).toBe('Alice');
	});

	it('omits display_hint when display_name is email-shaped', () => {
		const result = requireIdentity(
			makeLocals(makeUser({ user_metadata: { display_name: 'alice@example.com' } }))
		);
		expect(result.display_hint).toBeUndefined();
	});
});
