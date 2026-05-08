// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { capture } from './analytics.js';

describe('analytics.capture', () => {
	let plausibleSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		plausibleSpy = vi.fn();
		window.plausible = plausibleSpy as unknown as typeof window.plausible;
	});

	afterEach(() => {
		delete window.plausible;
	});

	it('calls window.plausible with the event name when no props provided', () => {
		capture('conversation_published');
		expect(plausibleSpy).toHaveBeenCalledTimes(1);
		expect(plausibleSpy).toHaveBeenCalledWith('conversation_published', undefined);
	});

	it('calls window.plausible with props wrapped in { props } when provided', () => {
		capture('invitation_sent', { origin: 'read_view' });
		expect(plausibleSpy).toHaveBeenCalledTimes(1);
		expect(plausibleSpy).toHaveBeenCalledWith('invitation_sent', {
			props: { origin: 'read_view' }
		});
	});

	it('passes numeric and boolean prop values through', () => {
		capture('slots_changed', { added: 1, edited: 0, removed: 2 });
		expect(plausibleSpy).toHaveBeenCalledWith('slots_changed', {
			props: { added: 1, edited: 0, removed: 2 }
		});
	});

	it('is a silent no-op when window.plausible is undefined', () => {
		delete window.plausible;
		expect(() => capture('conversation_published')).not.toThrow();
	});

	it('is a silent no-op when window.plausible is not a function', () => {
		// @ts-expect-error — intentional misuse to verify defensive check
		window.plausible = 'not-a-function';
		expect(() => capture('conversation_published')).not.toThrow();
	});
});
