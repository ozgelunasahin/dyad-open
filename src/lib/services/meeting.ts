import type { SupabaseClient } from '@supabase/supabase-js';
import type { Meeting, MeetingWithLocation, MeetingDetail, CancellationTier } from '$lib/domain/types.js';

export interface MeetingService {
	getWithLocation(meetingId: string): Promise<MeetingWithLocation | null>;
	getDetail(meetingId: string): Promise<MeetingDetail | null>;
	getMyMeetings(userId: string): Promise<Meeting[]>;
	cancel(meetingId: string, reason?: string): Promise<CancellationTier>;
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

	async getMyMeetings(userId: string): Promise<Meeting[]> {
		const { data, error } = await this.supabase
			.from('meetings')
			.select('*')
			.order('scheduled_time', { ascending: true });

		if (error) throw new Error(`Failed to load meetings: ${error.message}`);
		// RLS filters to only the user's own meetings
		return (data ?? []) as Meeting[];
	}

	async cancel(meetingId: string, reason?: string): Promise<CancellationTier> {
		const { data, error } = await this.supabase.rpc('cancel_meeting', {
			p_meeting_id: meetingId,
			p_reason: reason ?? null
		});

		if (error) throw new Error(`Failed to cancel meeting: ${error.message}`);
		return data as CancellationTier;
	}
}
