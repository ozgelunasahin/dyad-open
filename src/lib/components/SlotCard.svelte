<script lang="ts">
	import type { Snippet } from 'svelte';
	import { formatHybridDate, formatSlotTimeRange } from '$lib/utils/dates.js';
	import { isSlotFull, slotEndPassed } from '$lib/domain/time-slot.js';
	import { copy } from '$lib/copy.js';

	interface Props {
		startTime: string;
		durationMinutes: number;
		area: string;
		selected?: boolean;
		invited?: boolean;
		exactLocation?: { name: string; address: string; lat?: number; lng?: number } | null;
		past?: boolean;
		vague?: boolean;
		/** Optional right-hand content nested inside the card (e.g. the avatar
		 *  stack of who's joining this time). Static variant only. */
		children?: Snippet;
		/** 'meeting' applies the meeting tints (scheduled green / past neutral)
		 *  and derives the past state from the end time — the unified card for a
		 *  confirmed meeting. 'plain' (default) is the offered-time look. */
		tone?: 'plain' | 'meeting';
		/** Cancelled-meeting chrome: muted card, date strikethrough, attribution
		 *  + optional reason. Props describe the facts; the card renders them. */
		cancelled?: boolean;
		cancelledByMe?: boolean;
		cancelledByUsername?: string | null;
		cancellationReason?: string | null;
		/** Invitation sent, not yet accepted: dashed border + optional note +
		 *  withdraw (a free action — no confirm). */
		invitedPending?: boolean;
		pendingNote?: string | null;
		onWithdraw?: () => void;
		withdrawing?: boolean;
		// Capacity-aware fullness + "who's joining" marker. `occupied` is the
		// count of confirmed joiners on this slot (from the viewer-safe occupancy
		// RPC), used for the full/capacity derivation; `capacity` is the prompt's
		// per-slot joiner cap (null = unlimited). `othersJoining` is the
		// low-resolution marker count and EXCLUDES the viewer's own seat when they
		// hold one on this slot (the parent subtracts it), so it counts OTHERS only.
		occupied?: number;
		capacity?: number | null;
		othersJoining?: number;
		onclick?: () => void;
	}

	let { startTime, durationMinutes, area, selected = false, invited = false, exactLocation, past = false, vague = false, occupied = 0, capacity = null, othersJoining = 0, onclick, children, tone = 'plain', cancelled = false, cancelledByMe = false, cancelledByUsername = null, cancellationReason = null, invitedPending = false, pendingNote = null, onWithdraw, withdrawing = false }: Props = $props();

	let full = $derived(isSlotFull(occupied, capacity));

	// Meeting-state derivation (unified card): props describe the facts, the
	// card decides the chrome. Mirrors the retired MeetingCard's state model.
	const isCancelled = $derived(cancelled || cancelledByMe || !!cancelledByUsername);
	const isPastMeeting = $derived(
		tone === 'meeting' && !invitedPending && !isCancelled && slotEndPassed(startTime, durationMinutes)
	);
	// A full slot is not invitable — drop interactivity even if an onclick was
	// passed (the parent disables/ignores it, this is the rendering safety net).
	let interactive = $derived(!!onclick && !invited && !vague && !full);
	let showOthers = $derived(othersJoining > 0);

	/** formatHybridDate returns "Today", "Tomorrow", "Friday", or "28 Mar".
	 *  For weekday-only results (2–6 days out), append the day number. */
	function formatSlotDateFull(iso: string): string {
		const date = new Date(iso);
		const hybrid = formatHybridDate(iso);
		if (hybrid === 'Today' || hybrid === 'Tomorrow') return hybrid;
		if (/^\d/.test(hybrid)) return hybrid; // already "28 Mar"
		return `${hybrid} ${date.getDate()}`; // "Friday 28"
	}

	function formatSlotDayOnly(iso: string): string {
		const hybrid = formatHybridDate(iso);
		// formatHybridDate returns "Today"/"Tomorrow"/weekday/"28 Mar"
		// For dates > 6 days out it returns "28 Mar" — show full weekday name instead
		if (/^\d/.test(hybrid)) return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long' });
		return hybrid;
	}
</script>

{#if vague}
	<div class="slot-card vague">
		<div class="slot-row">
			<span class="slot-date">{formatSlotDayOnly(startTime)}</span>
			<span class="slot-details">{area}</span>
		</div>
	</div>
{:else if interactive}
	<button
		class="slot-card"
		class:selected
		class:past
		onclick={onclick}
		aria-pressed={selected}
	>
		<div class="slot-row">
			<span class="slot-date">{formatSlotDateFull(startTime)} · {formatSlotTimeRange(startTime, durationMinutes)}</span>
			<span class="slot-details">{area}</span>
		</div>
		{#if showOthers}
			<p class="slot-others">{copy.conversation.othersJoining(othersJoining)}</p>
		{/if}
	</button>
{:else}
	<div
		class="slot-card"
		class:selected
		class:invited
		class:past={past || isPastMeeting}
		class:full
		class:tone-meeting={tone === 'meeting'}
		class:state-cancelled={isCancelled}
		class:state-invited={invitedPending}
	>
		<div class="slot-row">
			<span class="slot-date">{formatSlotDateFull(startTime)} · {formatSlotTimeRange(startTime, durationMinutes)}</span>
			<span class="slot-details">
				{area}{#if full}<span class="slot-status">{copy.conversation.slotFull}</span>{/if}
			</span>
		</div>
		{#if invitedPending && pendingNote}
			<p class="slot-pending-note">{pendingNote}</p>
		{/if}
		{#if showOthers}
			<p class="slot-others">{copy.conversation.othersJoining(othersJoining)}</p>
		{/if}
		{#if isCancelled}
			<p class="slot-cancel-status">
				{cancelledByMe
					? copy.profile.meetingCancelledByYou
					: cancelledByUsername
						? copy.profile.meetingCancelledBy(cancelledByUsername)
						: copy.profile.meetingCancelled}
			</p>
			{#if cancellationReason}
				<blockquote class="slot-cancel-reason">{cancellationReason}</blockquote>
			{/if}
		{/if}
		{#if exactLocation || children || (invitedPending && onWithdraw)}
			<!-- Foot row, under the rule: location on the left, optional nested
			     content (the joining avatar stack) or the withdraw action right. -->
			<div class="slot-foot">
				{#if exactLocation}
					{#if exactLocation.lat}
						<a class="slot-location" href="https://www.openstreetmap.org/?mlat={exactLocation.lat}&mlon={exactLocation.lng}&zoom=17" target="_blank" rel="noopener">
							<span class="slot-location-name">{exactLocation.name}</span>
							<span class="slot-location-address">{exactLocation.address}</span>
						</a>
					{:else}
						<div class="slot-location">
							<span class="slot-location-name">{exactLocation.name}</span>
							<span class="slot-location-address">{exactLocation.address}</span>
						</div>
					{/if}
				{/if}
				{#if children}
					<div class="slot-aside">{@render children()}</div>
				{/if}
				{#if invitedPending && onWithdraw}
					<button class="slot-withdraw" onclick={onWithdraw} disabled={withdrawing}>
						{withdrawing ? copy.conversation.withdrawing : copy.conversation.withdrawInvitation}
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.slot-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		margin-bottom: var(--space-3);
		text-align: left;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 0.15s, background 0.15s, color 0.15s;
	}

	button.slot-card {
		cursor: pointer;
	}
	button.slot-card:hover {
		border-color: var(--text-primary);
	}

	.slot-card.selected {
		border-color: var(--text-primary);
		border-width: 2px;
	}

	.slot-card.invited {
		opacity: var(--opacity-disabled);
	}

	.slot-card.past {
		opacity: var(--opacity-disabled);
	}

	/* Full slot: not invitable. Dimmed like past/invited, no pointer affordance. */
	.slot-card.full {
		opacity: var(--opacity-disabled);
	}

	/* Meeting tone + states — the unified card for confirmed meetings (mirrors
	   the retired MeetingCard's chrome). */
	.slot-card.tone-meeting {
		background: var(--bg-meeting-scheduled);
	}
	.slot-card.tone-meeting.past {
		opacity: 1; /* a past meeting is a record, not a disabled control */
		background: var(--bg-meeting-past);
	}
	.slot-card.tone-meeting.past .slot-date {
		font-style: italic;
	}
	.slot-card.state-cancelled {
		background: transparent;
		border-color: color-mix(in srgb, var(--text-primary) 12%, transparent);
		color: var(--text-muted);
		opacity: 1;
	}
	.slot-card.state-cancelled .slot-date {
		text-decoration: line-through;
	}
	.slot-card.state-invited {
		background: transparent;
		border: 1px dashed var(--border-meeting-pending);
	}
	.slot-pending-note {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-style: italic;
		color: var(--text-muted);
		margin: 0;
	}
	.slot-cancel-status {
		font-size: var(--text-sm);
		font-style: italic;
		color: var(--text-muted);
		margin: 0;
	}
	.slot-cancel-reason {
		font-size: var(--text-sm);
		font-style: italic;
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
		padding: 0;
		border: none;
	}
	.slot-withdraw {
		flex-shrink: 0;
		margin-left: auto;
		font-family: inherit;
		font-size: var(--text-xs);
		color: var(--text-muted);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-style: dotted;
	}
	.slot-withdraw:hover { color: var(--text-primary); }
	.slot-withdraw:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	/* Low-resolution "+N others joining" marker — quiet, beneath the time row. */
	.slot-others {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		letter-spacing: 0.01em;
		margin: var(--space-2) 0 0;
	}

	.slot-card.vague {
		color: var(--text-muted);
		opacity: 0.45;
		pointer-events: none;
		user-select: none;
	}

	/* Foot row under the rule: location left, optional nested content (e.g. the
	   joining avatar stack) on the right. The rule lives on the row so it spans
	   the card whether or not a location is present. */
	.slot-foot {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-top: var(--space-3);
		margin-top: var(--space-1);
		border-top: 1px solid var(--border-link);
	}
	.slot-aside {
		flex-shrink: 0;
		margin-left: auto;
	}

	.slot-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
	}

	.slot-date {
		font-size: var(--text-md);
		font-weight: 500;
		line-height: var(--leading-tight);
	}

	.slot-details {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		text-align: right;
		flex-shrink: 0;
	}

	a.slot-location {
		text-decoration: none;
		color: inherit;
	}
	a.slot-location:hover .slot-location-name { text-decoration: underline; }

	.slot-location {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1;
		min-width: 0;
	}

	.slot-location-name {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--text-primary);
	}

	.slot-location-address {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.slot-status {
		margin-left: var(--space-2);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.slot-status::before {
		content: '· ';
	}
</style>
