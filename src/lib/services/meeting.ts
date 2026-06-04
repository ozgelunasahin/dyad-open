import type { SupabaseClient } from '@supabase/supabase-js';
import type { Meeting, MeetingWithLocation, MeetingDetail, CancellationTier } from '$lib/domain/types.js';
import { DomainError } from '$lib/domain/errors.js';

export interface MeetingService {
	getWithLocation(meetingId: string): Promise<MeetingWithLocation | null>;
	getDetail(meetingId: string): Promise<MeetingDetail | null>;
	getMyMeetings(userId: string): Promise<(Meeting & { general_area: string | null })[]>;
	cancel(meetingId: string, reason?: string): Promise<CancellationTier>;
	/** Host-only: cancel joiners on the anchor meeting's slot in one act.
	 *  Without a selection, the ENTIRETY: every live pair cancels and the time
	 *  is withdrawn. With pairMeetingIds, just those pairs cancel and the time
	 *  stays open. Returns the tier plus, per affected joiner, THEIR
	 *  pair-meeting id (meetings RLS hides other pairs' pages, so each email
	 *  must link the recipient's own). */
	cancelGathering(
		meetingId: string,
		reason?: string,
		pairMeetingIds?: string[]
	): Promise<{ tier: CancellationTier; joiners: { joinerId: string; meetingId: string }[] }>;
}

export class SupabaseMeetingService implements MeetingService {
	constructor(private supabase: SupabaseClient) {}

	async getWithLocation(meetingId: string): Promise<MeetingWithLocation | null> {
		const { data, error } = await this.supabase.rpc('get_meeting_with_location', {
			p_meeting_id: meetingId
		});

		if (error) throw new Error(`Failed to get meeting: ${error.message}`);
		if (!data || (Array.isArray(data) && data.length === 0)) return null;
		return (Array.isArray(data) ? data[0] : data) as MeetingWithLocation;
	}

	async getDetail(meetingId: string): Promise<MeetingDetail | null> {
		const { data, error } = await this.supabase.rpc('get_meeting_detail', {
			p_meeting_id: meetingId
		});

		if (error) throw new Error(`Failed to get meeting detail: ${error.message}`);
		if (!data || (Array.isArray(data) && data.length === 0)) return null;
		return (Array.isArray(data) ? data[0] : data) as MeetingDetail;
	}

	async getMyMeetings(userId: string): Promise<(Meeting & { general_area: string | null })[]> {
		const { data, error } = await this.supabase
			.from('meetings')
			.select('*, slot:slot_id(general_area)')
			.order('scheduled_time', { ascending: true });

		if (error) throw new Error(`Failed to load meetings: ${error.message}`);
		// RLS filters to only the user's own meetings
		// Flatten the slot join into the meeting object
		return (data ?? []).map((m: any) => ({
			...m,
			general_area: m.slot?.general_area ?? null,
			slot: undefined
		})) as (Meeting & { general_area: string | null })[];
	}

	async cancel(meetingId: string, reason?: string): Promise<CancellationTier> {
		const { data, error } = await this.supabase.rpc('cancel_meeting', {
			p_meeting_id: meetingId,
			p_reason: reason ?? null
		});

		if (error) {
			// cancel_meeting RPC raises specific validation messages. Surface them to the user.
			const msg = error.message ?? '';
			if (msg.includes('Meeting not found')) throw new DomainError(msg, 404);
			if (msg.includes('Not a participant')) throw new DomainError(msg, 403);
			if (msg.includes('Early cancellation requires an explanation')) throw new DomainError(msg, 400);
			throw new Error(`Failed to cancel meeting: ${msg}`);
		}
		return data as CancellationTier;
	}

	async cancelGathering(
		meetingId: string,
		reason?: string,
		pairMeetingIds?: string[]
	): Promise<{ tier: CancellationTier; joiners: { joinerId: string; meetingId: string }[] }> {
		const { data, error } = await this.supabase.rpc('cancel_gathering', {
			p_meeting_id: meetingId,
			p_reason: reason ?? null,
			p_pair_meeting_ids: pairMeetingIds ?? null
		});

		if (error) {
			// cancel_gathering raises the same validation messages as cancel_meeting,
			// plus 'Not authorized' for non-hosts and 'Nothing selected' for an
			// empty selection.
			const msg = error.message ?? '';
			if (msg.includes('Meeting not found')) throw new DomainError(msg, 404);
			if (msg.includes('Not authorized')) throw new DomainError(msg, 403);
			if (msg.includes('Early cancellation requires an explanation')) throw new DomainError(msg, 400);
			if (msg.includes('Nothing selected')) throw new DomainError(msg, 400);
			throw new Error(`Failed to cancel gathering: ${msg}`);
		}

		const rows = (data ?? []) as { tier: CancellationTier; joiner_id: string; meeting_id: string }[];
		return {
			tier: rows[0]?.tier ?? 'early',
			joiners: rows.map((r) => ({ joinerId: r.joiner_id, meetingId: r.meeting_id }))
		};
	}
}
