import type { FeedbackForm } from './types.js';

/** Can this user submit/edit this feedback form? */
export function canSubmit(form: FeedbackForm, userId: string): boolean {
	return (
		(form.state === 'due' || form.state === 'submitted') && form.reviewer_id === userId
	);
}

/** Is this form in the gated state (blocks app access)? */
export function isGated(form: FeedbackForm): boolean {
	return form.state === 'due';
}

/** Has this form been revealed (both parties submitted + locked)? */
export function isRevealed(form: FeedbackForm): boolean {
	return form.state === 'locked';
}
