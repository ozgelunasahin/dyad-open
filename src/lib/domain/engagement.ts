import type { Prompt, TimeSlot, MeetingInvitation } from './types.js';
import { isAvailable } from './time-slot.js';

/** Can this user comment on this prompt? */
export function canComment(prompt: Prompt, userId: string): boolean {
	return prompt.state === 'published' && prompt.author_id !== userId;
}

/** Can this user invite the prompt author for this slot? */
export function canInvite(prompt: Prompt, slot: TimeSlot, userId: string): boolean {
	return prompt.state === 'published' && prompt.author_id !== userId && isAvailable(slot);
}

/** Can this user cancel this invitation? (inviter only, while pending) */
export function canCancel(invitation: MeetingInvitation, userId: string): boolean {
	return invitation.state === 'pending' && invitation.inviter_id === userId;
}

/** Can this user accept this invitation? (invitee only, while pending) */
export function canAccept(invitation: MeetingInvitation, userId: string): boolean {
	return invitation.state === 'pending' && invitation.invitee_id === userId;
}
