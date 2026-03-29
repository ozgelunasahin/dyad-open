<script lang="ts">
	import { formatHybridDate, formatSlotTime, formatSlotDetails } from '$lib/utils/dates.js';

	interface Props {
		startTime: string;
		durationMinutes: number;
		area: string;
		selected?: boolean;
		invited?: boolean;
		past?: boolean;
		onclick?: () => void;
	}

	let { startTime, durationMinutes, area, selected = false, invited = false, past = false, onclick }: Props = $props();

	let interactive = $derived(!!onclick && !invited);
</script>

{#if interactive}
	<button
		class="slot-card"
		class:selected
		class:past
		onclick={onclick}
		aria-pressed={selected}
	>
		<span class="slot-date">{formatHybridDate(startTime)} at {formatSlotTime(startTime)}</span>
		<span class="slot-details">{formatSlotDetails(durationMinutes, area)}</span>
		{#if invited}<span class="slot-badge">Invited</span>{/if}
	</button>
{:else}
	<div class="slot-card" class:selected class:invited class:past>
		<span class="slot-date">{formatHybridDate(startTime)} at {formatSlotTime(startTime)}</span>
		<span class="slot-details">{formatSlotDetails(durationMinutes, area)}</span>
		{#if invited}<span class="slot-badge">Invited</span>{/if}
	</div>
{/if}

<style>
	.slot-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
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
		opacity: 0.5;
	}

	.slot-card.past {
		opacity: 0.5;
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
		opacity: 0.6;
	}

	.slot-badge {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-top: var(--space-1);
	}
</style>
