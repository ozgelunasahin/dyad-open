import { describe, it, expect } from 'vitest';
import { membershipErrorMessage, isMembershipGate } from './membership-error.js';
import { copy } from '$lib/copy.js';

describe('membershipErrorMessage', () => {
	it('maps membership_required + had_membership:true to the renew prompt', () => {
		const msg = membershipErrorMessage({ error: 'membership_required', had_membership: true }, 'fallback');
		expect(msg).toBe(copy.membership.gatePrompt(true));
		expect(msg).not.toContain('membership_required'); // never the raw token
	});

	it('maps membership_required without had_membership to the join prompt', () => {
		expect(membershipErrorMessage({ error: 'membership_required' }, 'fallback')).toBe(
			copy.membership.gatePrompt(false)
		);
	});

	it('passes through a non-gate error message', () => {
		expect(membershipErrorMessage({ error: 'This conversation is full.' }, 'fallback')).toBe(
			'This conversation is full.'
		);
	});

	it('uses the fallback when there is no error message', () => {
		expect(membershipErrorMessage({}, 'fallback')).toBe('fallback');
	});

	it('isMembershipGate detects the token', () => {
		expect(isMembershipGate({ error: 'membership_required' })).toBe(true);
		expect(isMembershipGate({ error: 'nope' })).toBe(false);
		expect(isMembershipGate({})).toBe(false);
	});
});
