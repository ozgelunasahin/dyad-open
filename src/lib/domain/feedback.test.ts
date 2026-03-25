import { describe, it, expect } from 'vitest';
import { canSubmit, isGated, isRevealed } from './feedback.js';
import type { FeedbackForm } from './types.js';

function makeForm(overrides: Partial<FeedbackForm> = {}): FeedbackForm {
	return {
		id: 'f1',
		meeting_id: 'm1',
		reviewer_id: 'user-a',
		reviewee_id: 'user-b',
		did_meet: null,
		no_show_reason: null,
		rating_tags: [],
		free_text: null,
		share_with_person: null,
		state: 'due',
		submitted_at: null,
		locked_at: null,
		created_at: new Date().toISOString(),
		...overrides
	};
}

describe('canSubmit', () => {
	it('true for due form by reviewer', () => {
		expect(canSubmit(makeForm(), 'user-a')).toBe(true);
	});

	it('true for submitted form by reviewer (editable)', () => {
		expect(canSubmit(makeForm({ state: 'submitted' }), 'user-a')).toBe(true);
	});

	it('false for locked form', () => {
		expect(canSubmit(makeForm({ state: 'locked' }), 'user-a')).toBe(false);
	});

	it('false for released form', () => {
		expect(canSubmit(makeForm({ state: 'released' }), 'user-a')).toBe(false);
	});

	it('false for non-reviewer', () => {
		expect(canSubmit(makeForm(), 'user-b')).toBe(false);
	});
});

describe('isGated', () => {
	it('true for due', () => {
		expect(isGated(makeForm())).toBe(true);
	});

	it('false for submitted', () => {
		expect(isGated(makeForm({ state: 'submitted' }))).toBe(false);
	});

	it('false for locked', () => {
		expect(isGated(makeForm({ state: 'locked' }))).toBe(false);
	});
});

describe('isRevealed', () => {
	it('true for locked', () => {
		expect(isRevealed(makeForm({ state: 'locked' }))).toBe(true);
	});

	it('false for submitted', () => {
		expect(isRevealed(makeForm({ state: 'submitted' }))).toBe(false);
	});

	it('false for due', () => {
		expect(isRevealed(makeForm())).toBe(false);
	});
});
