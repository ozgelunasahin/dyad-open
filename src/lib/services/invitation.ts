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

	/** Accept an invitation. Returns meeting ID on success, null if slot already booked. Authorization via auth.uid(). */
	accept(invitationId: string): Promise<string | null>;

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

	async accept(invitationId: string): Promise<string | null> {
		const { data, error } = await this.supabase.rpc('accept_invitation', {
			p_invitation_id: invitationId
		});

		if (error) throw new Error(`Failed to accept invitation: ${error.message}`);
		return (data as string) ?? null;
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
