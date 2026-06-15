/** Group invite link lifecycle state, shared by the join page (which renders
 *  a friendly state per value) and the admin scope-detail list (which shows
 *  'active' for 'open'). One evaluation order, one capacity comparison —
 *  the authoritative enforcement is redeem_group_invite_link (migration
 *  20260605100300); this read-only derivation must mirror it. */

export type GroupLinkState = 'open' | 'unknown' | 'closed' | 'full' | 'revoked';

export interface GroupLinkStateInput {
	revoked_at: string | null;
	join_closes_at: string;
	max_redemptions: number | null;
	redemption_count: number;
}

export function deriveGroupLinkState(link: GroupLinkStateInput | null): GroupLinkState {
	if (!link) return 'unknown';
	if (link.revoked_at) return 'revoked';
	if (link.max_redemptions !== null && link.redemption_count >= link.max_redemptions)
		return 'full';
	if (new Date(link.join_closes_at).getTime() < Date.now()) return 'closed';
	return 'open';
}
