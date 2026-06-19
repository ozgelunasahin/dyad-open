import { describe, it, expect } from 'vitest';
import { copy } from './copy.js';

// Contract the NotificationHint component + the notification surfaces depend on.
// The component renders a string by splitting it on a single `{link}` marker and
// dropping a link to /profile/preferences in the gap; the values rule (identity
// decoupled from email, calm/channel-agnostic) means these strings must never
// name "email". A unit test guards both without a DOM testing harness.
describe('notification hint copy contract', () => {
	const p = copy.preferences;

	const contextualHints = {
		invited: p.notificationHintInvited('mara'),
		responses: p.notificationHintResponses,
		meeting: p.notificationHintMeeting
	};

	it('every contextual hint carries exactly one {link} marker', () => {
		for (const [name, s] of Object.entries(contextualHints)) {
			expect(s.split('{link}').length, `${name} must contain one {link}`).toBe(2);
		}
	});

	it('the onboarding copy carries a {link} marker for the preferences link', () => {
		expect(p.notificationOnboarding.split('{link}').length).toBe(2);
	});

	it('contextual hints and onboarding copy never name "email" (channel-agnostic)', () => {
		for (const s of [...Object.values(contextualHints), p.notificationOnboarding]) {
			expect(s.toLowerCase()).not.toContain('email');
		}
	});

	it('the invited hint interpolates the author handle', () => {
		expect(p.notificationHintInvited('mara')).toContain('@mara');
	});

	it('the link labels are present and non-empty', () => {
		expect(p.notificationHintLink.length).toBeGreaterThan(0);
		expect(p.notificationPrefsLink.length).toBeGreaterThan(0);
	});
});
