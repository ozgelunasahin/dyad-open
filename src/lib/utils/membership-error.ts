import { copy } from '$lib/copy.js';

/** Shape of the 403 a gated action returns. */
interface GateError {
	error?: string;
	had_membership?: boolean;
}

/**
 * Map a failed gated-action response to member-facing copy. The `membership_required`
 * token (with `had_membership` choosing renew vs join) becomes a friendly prompt;
 * any other error falls back to its own message or the caller's default. Keeps the
 * raw API token from ever reaching the member (CLAUDE.md domain-language boundary).
 */
export function membershipErrorMessage(body: GateError, fallback: string): string {
	if (body?.error === 'membership_required') {
		return copy.membership.gatePrompt(body.had_membership === true);
	}
	return body?.error ?? fallback;
}

/** Whether a failed response is the membership gate (so the UI can show a
 *  /membership link alongside the message). */
export function isMembershipGate(body: GateError): boolean {
	return body?.error === 'membership_required';
}
