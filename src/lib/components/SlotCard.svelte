<script lang="ts">
	import type { Snippet } from 'svelte';
	import { formatHybridDate, formatSlotTimeRange } from '$lib/utils/dates.js';
	import { isSlotFull } from '$lib/domain/time-slot.js';
	import { copy } from '$lib/copy.js';

	interface Props {
		startTime: string;
		durationMinutes: number;
		area: string;
		selected?: boolean;
		invited?: boolean;
		invitedNote?: string;
		exactLocation?: { name: string; address: string; lat?: number; lng?: number } | null;
		past?: boolean;
		vague?: boolean;
		/** Optional right-hand content nested inside the card (e.g. the avatar
		 *  stack of who's joining this time). Static variant only. */
		children?: Snippet;
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

	let { startTime, durationMinutes, area, selected = false, invited = false, invitedNote, exactLocation, past = false, vague = false, occupied = 0, capacity = null, othersJoining = 0, onclick, children }: Props = $props();

	let full = $derived(isSlotFull(occupied, capacity));
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
	<div class="slot-card" class:selected class:invited class:past class:full>
		<div class="slot-row">
			<span class="slot-date">{formatSlotDateFull(startTime)} · {formatSlotTimeRange(startTime, durationMinutes)}</span>
			<span class="slot-details">
				{area}{#if full}<span class="slot-status">{copy.conversation.slotFull}</span>{:else if invitedNote}<span class="slot-status">{invitedNote}</span>{/if}
			</span>
		</div>
		{#if showOthers}
			<p class="slot-others">{copy.conversation.othersJoining(othersJoining)}</p>
		{/if}
		{#if exactLocation || children}
			<!-- Foot row, under the rule: location on the left, optional nested
			     content (e.g. the joining avatar stack) on the right. -->
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
