<script lang="ts">
	import { formatHybridDate, formatSlotTimeRange } from '$lib/utils/dates.js';

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
		onclick?: () => void;
	}

	let { startTime, durationMinutes, area, selected = false, invited = false, invitedNote, exactLocation, past = false, vague = false, onclick }: Props = $props();

	let interactive = $derived(!!onclick && !invited && !vague);

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
	</button>
{:else}
	<div class="slot-card" class:selected class:invited class:past>
		<div class="slot-row">
			<span class="slot-date">{formatSlotDateFull(startTime)} · {formatSlotTimeRange(startTime, durationMinutes)}</span>
			<span class="slot-details">{area}</span>
		</div>
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
		{#if invited}
			<span class="slot-status">{invitedNote ?? 'Invited'}</span>
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

	.slot-card.vague {
		color: var(--text-muted);
		opacity: 0.45;
		pointer-events: none;
		user-select: none;
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
		padding-top: var(--space-3);
		margin-top: var(--space-1);
		border-top: 1px solid var(--border-link);
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
		display: block;
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: var(--leading-normal);
	}
</style>
