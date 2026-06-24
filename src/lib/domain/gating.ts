/**
 * Per-action membership gating.
 *
 * The single source of truth for which actions can be gated behind an active
 * membership. The endpoint checks, the RLS `app.gating_allows` function input,
 * the accept-invitation RPC guard, and the admin toggles all key off these
 * exact strings — so they can never drift on a literal.
 *
 * Reads / browsing are NEVER in this catalog (plan R8): only state-changing
 * interactions. The same JSONB config expresses all three cofounder positions —
 * "everything gated" (all true), "browse-free / interact-paid" (subset true),
 * "gating off" (all false / absent) — as configuration, not a code fork (R9).
 */
export const PROTECTED_ACTIONS = [
	'create_conversation',
	'respond_take_slot',
	'invite_to_meet'
] as const;

export type ProtectedAction = (typeof PROTECTED_ACTIONS)[number];

/** The operator-edited config: action -> "requires an active membership". An
 *  absent or false flag means the action is open to all registered guests. */
export type MembershipGating = Partial<Record<ProtectedAction, boolean>>;

export function isProtectedAction(value: unknown): value is ProtectedAction {
	return typeof value === 'string' && (PROTECTED_ACTIONS as readonly string[]).includes(value);
}

/**
 * Operator-facing labels for the admin toggles. `respond_take_slot` deliberately
 * spans BOTH writing a response AND accepting an invitation (taking a slot) —
 * the latter runs through the `accept_invitation` SECURITY DEFINER RPC, which is
 * gated inside its body (RLS cannot reach a DEFINER write). Documented here so
 * the two enforcement points never diverge on what the action covers.
 */
export const PROTECTED_ACTION_META: Record<ProtectedAction, { label: string; hint: string }> = {
	create_conversation: {
		label: 'Create a conversation',
		hint: 'Whether starting a new conversation requires an active membership.'
	},
	respond_take_slot: {
		label: 'Respond and take a time',
		hint: 'Covers writing a response to a conversation and accepting an invitation (taking a time). Reading stays open.'
	},
	invite_to_meet: {
		label: 'Invite to meet',
		hint: 'Whether inviting someone to meet requires an active membership.'
	}
};
