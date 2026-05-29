import type { SupabaseClient } from '@supabase/supabase-js';
import type { MeetingInvitation } from '$lib/domain/types.js';
import { DomainError } from '$lib/domain/errors.js';

export interface InvitationService {
	create(params: {
		promptId: string;
		slotId: string;
		inviterId: string;
		inviteeId: string;
		commentId?: string;
		message?: string;
	}): Promise<MeetingInvitation>;

	cancel(invitationId: string, inviterId: string): Promise<void>;

	/** Accept an invitation. Returns the meeting ID on success. Throws a
	 *  DomainError when the slot is full / over capacity / no longer available
	 *  (the RPC returns NULL in those cases). Authorization via app.current_user_id(). */
	accept(invitationId: string): Promise<string>;

	/** Decline a pending invitation with an optional reason. Authorization via auth.uid() (must be invitee). */
	decline(invitationId: string, reason?: string): Promise<void>;

	getPendingForPrompt(promptId: string, userId: string): Promise<MeetingInvitation[]>;
}

export class SupabaseInvitationService implements InvitationService {
	constructor(private supabase: SupabaseClient) {}

	async create(params: {
		promptId: string;
		slotId: string;
		inviterId: string;
		inviteeId: string;
		commentId?: string;
		message?: string;
	}): Promise<MeetingInvitation> {
		const { data, error } = await this.supabase
			.from('prompt_invitations')
			.insert({
				prompt_id: params.promptId,
				slot_id: params.slotId,
				inviter_id: params.inviterId,
				invitee_id: params.inviteeId,
				comment_id: params.commentId ?? null,
				message: params.message ?? null
			})
			.select()
			.single();

		if (error) {
			// Postgres unique_violation on uq_one_pending_invitation_per_user_per_slot —
			// the user already has a pending invite for this exact slot. Surface as a
			// friendly DomainError instead of leaking the constraint name.
			const code = (error as { code?: string }).code;
			if (code === '23505') {
				throw new DomainError(
					'You already have a pending invitation for this slot.',
					409
				);
			}
			throw new Error(`Failed to create invitation: ${error.message}`);
		}
		return data as MeetingInvitation;
	}

	async cancel(invitationId: string, inviterId: string): Promise<void> {
		const { data, error } = await this.supabase
			.from('prompt_invitations')
			.update({ state: 'cancelled', resolved_at: new Date().toISOString() })
			.eq('id', invitationId)
			.eq('inviter_id', inviterId)
			.eq('state', 'pending')
			.select('id');

		if (error) throw new Error(`Failed to cancel invitation: ${error.message}`);
		if (!data || data.length === 0) {
			throw new DomainError('Invitation not found, already resolved, or not yours', 404);
		}
	}

	async accept(invitationId: string): Promise<string> {
		const { data, error } = await this.supabase.rpc('accept_invitation', {
			p_invitation_id: invitationId
		});

		if (error) throw new Error(`Failed to accept invitation: ${error.message}`);
		// The RPC returns NULL when the slot is full / over capacity, the slot
		// has expired, or the inviter already has a meeting on it. Surface a
		// clear reason rather than a silent no-op so the author sees why their
		// accept did not produce a meeting. Message matches
		// copy.conversation.conversationFull.
		const meetingId = data as string | null;
		if (!meetingId) {
			throw new DomainError('This conversation is full or no longer available.', 409);
		}
		return meetingId;
	}

	async decline(invitationId: string, reason?: string): Promise<void> {
		const { error } = await this.supabase.rpc('decline_invitation', {
			p_invitation_id: invitationId,
			p_reason: reason ?? null
		});

		if (error) {
			// Surface validation errors as DomainError so the API layer can choose
			// the right HTTP status without leaking the raw Postgres message.
			const msg = error.message ?? '';
			if (msg.includes('Not authorized')) {
				throw new DomainError('Not authorized to decline this invitation', 403);
			}
			if (msg.includes('not pending') || msg.includes('not found')) {
				throw new DomainError('Invitation not found or already resolved', 404);
			}
			if (msg.includes('at most 2000 characters')) {
				throw new DomainError('Reason must be at most 2000 characters', 400);
			}
			throw new Error(`Failed to decline invitation: ${error.message}`);
		}
	}

	async getPendingForPrompt(promptId: string, userId: string): Promise<MeetingInvitation[]> {
		// RLS handles visibility: inviter sees own, invitee sees all on their prompts
		const { data, error } = await this.supabase
			.from('prompt_invitations')
			.select('*')
			.eq('prompt_id', promptId)
			.eq('state', 'pending')
			.order('created_at', { ascending: true });

		if (error) throw new Error(`Failed to load invitations: ${error.message}`);
		return (data ?? []) as MeetingInvitation[];
	}
}
