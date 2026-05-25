import { describe, it, expect } from 'vitest';
import { canComment, canInvite, canCancel, canAccept } from './engagement.js';
import type { Prompt, TimeSlot, MeetingInvitation } from './types.js';

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
	return {
		id: 'p1',
		author_id: 'author-1',
		title: 'Test',
		body: null,
		cover_image_url: null,
		state: 'published',
		region: 'berlin',
		published_at: new Date().toISOString(),
		hidden_at: null,
		audience_scope: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides
	};
}

function makeSlot(overrides: Partial<TimeSlot> = {}): TimeSlot {
	return {
		id: 's1',
		prompt_id: 'p1',
		start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
		duration_minutes: 60,
		general_area: 'Kreuzberg',
		general_area_lat: 52.49,
		general_area_lng: 13.42,
		accepted: false,
		created_at: new Date().toISOString(),
		...overrides
	};
}

function makeInvitation(overrides: Partial<MeetingInvitation> = {}): MeetingInvitation {
	return {
		id: 'inv1',
		prompt_id: 'p1',
		slot_id: 's1',
		inviter_id: 'user-2',
		invitee_id: 'author-1',
		comment_id: null,
		message: null,
		state: 'pending',
		created_at: new Date().toISOString(),
		resolved_at: null,
		...overrides
	};
}

describe('canComment', () => {
	it('true for published prompt, different user', () => {
		expect(canComment(makePrompt(), 'user-2')).toBe(true);
	});

	it('false for own prompt', () => {
		expect(canComment(makePrompt(), 'author-1')).toBe(false);
	});

	it('false for draft prompt', () => {
		expect(canComment(makePrompt({ state: 'draft' }), 'user-2')).toBe(false);
	});
});

describe('canInvite', () => {
	it('true for published prompt, available slot, different user', () => {
		expect(canInvite(makePrompt(), makeSlot(), 'user-2')).toBe(true);
	});

	it('false for own prompt', () => {
		expect(canInvite(makePrompt(), makeSlot(), 'author-1')).toBe(false);
	});

	it('true for accepted slot — slots can host multiple meetings', () => {
		expect(canInvite(makePrompt(), makeSlot({ accepted: true }), 'user-2')).toBe(true);
	});

	it('false for expired slot', () => {
		const pastSlot = makeSlot({
			start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
		});
		expect(canInvite(makePrompt(), pastSlot, 'user-2')).toBe(false);
	});

	it('false for draft prompt', () => {
		expect(canInvite(makePrompt({ state: 'draft' }), makeSlot(), 'user-2')).toBe(false);
	});
});

describe('canCancel', () => {
	it('true for pending invitation by inviter', () => {
		expect(canCancel(makeInvitation(), 'user-2')).toBe(true);
	});

	it('false for non-inviter', () => {
		expect(canCancel(makeInvitation(), 'author-1')).toBe(false);
	});

	it('false for accepted invitation', () => {
		expect(canCancel(makeInvitation({ state: 'accepted' }), 'user-2')).toBe(false);
	});

	it('false for expired invitation', () => {
		expect(canCancel(makeInvitation({ state: 'expired' }), 'user-2')).toBe(false);
	});
});

describe('canAccept', () => {
	it('true for pending invitation by invitee', () => {
		expect(canAccept(makeInvitation(), 'author-1')).toBe(true);
	});

	it('false for non-invitee', () => {
		expect(canAccept(makeInvitation(), 'user-2')).toBe(false);
	});

	it('false for cancelled invitation', () => {
		expect(canAccept(makeInvitation({ state: 'cancelled' }), 'author-1')).toBe(false);
	});
});
