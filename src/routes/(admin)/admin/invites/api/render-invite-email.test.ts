import { describe, it, expect } from 'vitest';
import { renderInviteEmail } from './render-invite-email.js';

const INVITE_URL = 'https://dyad.berlin/join?token=test-token';
const EXPIRY = 14;

describe('renderInviteEmail — signed footer', () => {
	it('includes the dyad signature names', () => {
		const html = renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: EXPIRY });
		expect(html).toContain('With care and joy,');
		expect(html).toContain('Luna and Fiore');
		expect(html).toContain('dyad · berlin');
	});

	it('embeds SangBleu Sunrise via @font-face with a Georgia fallback', () => {
		const html = renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: EXPIRY });
		expect(html).toContain('@font-face');
		expect(html).toContain(
			"url('https://dyad.berlin/fonts/SangBleuSunrise-Light-WebXL.woff2')"
		);
		expect(html).toContain(
			"url('https://dyad.berlin/fonts/SangBleuSunrise-Regular-WebXL.woff2')"
		);
		expect(html).toMatch(/font-family: 'SangBleu Sunrise', Georgia, serif/);
	});

	it('retains the dyad logo as a link to dyad.berlin', () => {
		const html = renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: EXPIRY });
		expect(html).toContain('https://dyad.berlin/images/logo-dark.png');
		expect(html).toContain('<a href="https://dyad.berlin"');
	});

	it('renders the invite link', () => {
		const html = renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: EXPIRY });
		expect(html).toContain(`href="${INVITE_URL}"`);
		expect(html).toContain('Join dyad');
	});

	it('renders the expiry days the caller passes in', () => {
		expect(renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: 14 })).toContain(
			'expires in 14 days'
		);
		expect(renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: 30 })).toContain(
			'expires in 30 days'
		);
	});
});

describe('renderInviteEmail — opener and message', () => {
	it('omits the opener paragraph when none is supplied', () => {
		const html = renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: EXPIRY });
		// Footer still present
		expect(html).toContain('Luna and Fiore');
		// No stray empty opener tag
		expect(html).not.toMatch(/<p><\/p>/);
	});

	it('omits the message blockquote when none is supplied', () => {
		const html = renderInviteEmail({ inviteUrl: INVITE_URL, expiryDays: EXPIRY });
		expect(html).not.toContain('<blockquote');
	});

	it('renders both opener and message when supplied', () => {
		const html = renderInviteEmail({
			opener: 'Hi friend,',
			inviteUrl: INVITE_URL,
			message: 'Looking forward to meeting you.',
			expiryDays: EXPIRY
		});
		expect(html).toContain('<p>Hi friend,</p>');
		expect(html).toContain('<blockquote');
		expect(html).toContain('Looking forward to meeting you.');
		// Footer still present alongside personal content
		expect(html).toContain('Luna and Fiore');
	});

	it('escapes script tags in the message body', () => {
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			message: '<script>alert(1)</script>',
			expiryDays: EXPIRY
		});
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(html).not.toContain('<script>alert(1)</script>');
	});

	it('preserves message line breaks as <br> tags', () => {
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			message: 'line one\nline two',
			expiryDays: EXPIRY
		});
		expect(html).toContain('line one<br>line two');
	});

	it('renders the invite URL without double-escaping', () => {
		const url = 'https://dyad.berlin/join?token=abc&ref=xyz';
		const html = renderInviteEmail({ inviteUrl: url, expiryDays: EXPIRY });
		expect(html).toContain(`href="${url}"`);
	});
});

describe('renderInviteEmail — signature overrides', () => {
	it('uses the override closing when provided', () => {
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			expiryDays: EXPIRY,
			signatureClosing: 'Yours,'
		});
		expect(html).toContain('Yours,');
		expect(html).not.toContain('With care and joy,');
		// Names still default
		expect(html).toContain('Luna and Fiore');
	});

	it('uses the override names when provided', () => {
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			expiryDays: EXPIRY,
			signatureNames: 'Theodore'
		});
		expect(html).toContain('Theodore');
		expect(html).not.toContain('Luna and Fiore');
		// Closing still default
		expect(html).toContain('With care and joy,');
	});

	it('uses both overrides when both provided', () => {
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			expiryDays: EXPIRY,
			signatureClosing: 'Until soon,',
			signatureNames: 'Fiore'
		});
		expect(html).toContain('Until soon,');
		expect(html).toContain('Fiore');
		expect(html).not.toContain('With care and joy,');
		expect(html).not.toContain('Luna and Fiore');
	});

	it('falls back to defaults when overrides are empty strings', () => {
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			expiryDays: EXPIRY,
			signatureClosing: '',
			signatureNames: '   '
		});
		expect(html).toContain('With care and joy,');
		expect(html).toContain('Luna and Fiore');
	});

	it('escapes script tags in signature overrides', () => {
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			expiryDays: EXPIRY,
			signatureClosing: '<script>alert(1)</script>',
			signatureNames: '<img src=x onerror=alert(2)>'
		});
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).not.toContain('<img src=x onerror=alert(2)>');
	});

	it('never lets the brand line be overridden', () => {
		// brand is not part of the params; confirm it always renders the canonical value
		const html = renderInviteEmail({
			inviteUrl: INVITE_URL,
			expiryDays: EXPIRY,
			signatureClosing: 'Anything,',
			signatureNames: 'Anyone'
		});
		expect(html).toContain('dyad · berlin');
	});
});
