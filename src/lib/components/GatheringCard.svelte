<script lang="ts">
	import SlotCard from './SlotCard.svelte';
	import ParticipantsStack from './ParticipantsStack.svelte';
	import { copy } from '$lib/copy';

	// One composition for "a time that became a gathering" — the meeting-tone
	// SlotCard with the room as pins and an optional stretched overlay link to
	// the meeting page. Used on every surface that previews a meeting
	// (conversation author + attendee views, profile tabs) so the card looks
	// and behaves the same everywhere. Pins and the location link stay
	// clickable above the overlay — no nested anchors.
	interface Pin {
		/** Stable key (a meeting id works). */
		id: string;
		name: string;
		href?: string;
	}

	interface Props {
		startTime: string;
		durationMinutes: number;
		area: string;
		exactLocation?: { name: string; address: string; lat?: number; lng?: number } | null;
		/** Identified pins — only when the viewer's RLS yielded identities. */
		participants?: Pin[];
		/** The viewer's own pin ("you"), linked when href is given. */
		self?: { name: string; href?: string } | null;
		/** Anonymised seats — count only, never identities. */
		anonymousCount?: number;
		/** Card-surface link target; omit for an unlinked card. */
		meetingHref?: string | null;
		cancelled?: boolean;
		cancelledByMe?: boolean;
		cancelledByUsername?: string | null;
		cancellationReason?: string | null;
	}

	let {
		startTime,
		durationMinutes,
		area,
		exactLocation = null,
		participants = [],
		self = null,
		anonymousCount = 0,
		meetingHref = null,
		cancelled = false,
		cancelledByMe = false,
		cancelledByUsername = null,
		cancellationReason = null
	}: Props = $props();

	const isCancelled = $derived(cancelled || cancelledByMe || !!cancelledByUsername);
	const hasPins = $derived(participants.length > 0 || !!self || anonymousCount > 0);
</script>

<div class="meeting-card-wrap">
	<SlotCard
		tone="meeting"
		{startTime}
		{durationMinutes}
		{area}
		{exactLocation}
		{cancelled}
		{cancelledByMe}
		{cancelledByUsername}
		{cancellationReason}
	>
		<!-- A cancelled meeting has no room to show. -->
		{#if hasPins && !isCancelled}
			<ParticipantsStack {participants} {self} {anonymousCount} />
		{/if}
	</SlotCard>
	{#if meetingHref}
		<a class="meeting-card-overlay" href={meetingHref} aria-label={copy.common.openMeeting}></a>
	{/if}
</div>

<style>
	/* Stretched overlay: the card surface opens the meeting; positioned
	   children (pins, location link) stay clickable above it. Dim only when
	   the overlay itself is hovered — not when a pin is. */
	.meeting-card-wrap {
		position: relative;
		transition: opacity 0.15s;
	}
	.meeting-card-wrap:has(> .meeting-card-overlay:hover) {
		opacity: var(--opacity-hover-card);
	}
	.meeting-card-overlay {
		position: absolute;
		inset: 0;
		border-radius: var(--radius-card);
	}
</style>
