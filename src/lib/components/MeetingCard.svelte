<script lang="ts">
	import { copy } from '$lib/copy';
	import type { LocationRef } from '$lib/domain/types';

	/**
	 * Meeting context card — warm green-tinted sub-card showing a scheduled
	 * meeting's partner, time, and location. Rendered:
	 * - Inside ConversationCard when the conversation has a scheduled meeting.
	 * - Standalone on /meetings/[id] with exactLocation supplied.
	 *
	 * Style classes come from src/lib/styles/shared.css so the rendering stays
	 * consistent across conversation detail, profile, and meeting pages.
	 */
	interface Props {
		partnerUsername: string;
		scheduledTime: string; // ISO 8601
		durationMinutes: number;
		generalArea?: string | null;
		exactLocation?: LocationRef | null;
		cancelledByUsername?: string | null;
		hideLabel?: boolean; // e.g. when parent already says "Meeting with @x"
	}

	let {
		partnerUsername,
		scheduledTime,
		durationMinutes,
		generalArea = null,
		exactLocation = null,
		cancelledByUsername = null,
		hideLabel = false
	}: Props = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}
	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<div class="meeting-inline">
	{#if !hideLabel}
		<span class="meeting-inline-label">{copy.profile.meetingWith(partnerUsername)}</span>
	{/if}
	<span class="meeting-inline-detail">
		{formatDate(scheduledTime)} · {formatTime(scheduledTime)} · {durationMinutes} {copy.meeting.minutes}
	</span>
	{#if generalArea}
		<span class="meeting-inline-area">{generalArea}</span>
	{/if}
	{#if exactLocation}
		<span class="meeting-inline-location">{exactLocation.name}</span>
		<span class="meeting-inline-address">{exactLocation.address}</span>
	{/if}
	{#if cancelledByUsername}
		<span class="meeting-inline-status cancelled">
			{copy.profile.meetingCancelledBy(cancelledByUsername)}
		</span>
	{/if}
</div>
