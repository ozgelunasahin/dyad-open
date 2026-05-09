<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import ConversationCard from './ConversationCard.svelte';

	export interface BottomSheetItem {
		prompt: PromptSummary;
		/** When set (typically from a clicked map pin), the card shows the dates
		 *  and area for these specific slots instead of falling back to
		 *  `prompt.soonest_slot`. Multiple slots in the same area are joined
		 *  with a `·` separator; same-day slots dedupe at day granularity so
		 *  "Tue 6pm + Tue 8pm in Mitte" reads as "Tue 12 May", not duplicated. */
		slots?: TimeSlot[];
	}

	interface Props {
		items: BottomSheetItem[];
		onCardClick?: (promptId: string) => void;
		onClose?: () => void;
		hideAuthor?: boolean;
		navClearance?: boolean;
	}

	let { items, onCardClick, onClose, hideAuthor = false, navClearance = true }: Props = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	/**
	 * Format multiple slots as a single line of distinct day labels, e.g.
	 * "Tue 12 May · Wed 13 May". Same-day slots collapse to one label so two
	 * times on Tuesday don't render as "Tue 12 May · Tue 12 May".
	 */
	function formatSlotDates(slots: TimeSlot[]): string {
		const seen = new Set<string>();
		const labels: string[] = [];
		for (const s of slots) {
			const label = formatDate(s.start_time);
			if (seen.has(label)) continue;
			seen.add(label);
			labels.push(label);
		}
		return labels.join(' · ');
	}
</script>

{#if onClose}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sheet-backdrop" onclick={onClose} transition:fly={{ y: 0, duration: 200 }}></div>
{/if}
<div
	class="sheet"
	class:no-nav={!navClearance}
	transition:fly={{ y: 160, duration: 480, opacity: 0 }}
>
	{#if onClose}
		<button class="sheet-close" onclick={onClose} aria-label="Close">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		</button>
	{/if}
	<div class="sheet-body">
		{#each items as item}
			{@const slotsLabel = item.slots && item.slots.length > 0 ? formatSlotDates(item.slots) : null}
			{@const fallbackLabel = item.prompt.soonest_slot ? formatDate(item.prompt.soonest_slot) : null}
			{@const areaLabel = item.slots?.[0]?.general_area ?? null}
			<ConversationCard
				variant="compact"
				title={item.prompt.title ?? 'Untitled'}
				coverUrl={item.prompt.cover_image_url}
				snippet={item.prompt.body_snippet}
				metaLeft={slotsLabel ?? fallbackLabel}
				metaRight={areaLabel}
				authorUsername={item.prompt.author_username}
				anonymiseAuthor={hideAuthor}
				audienceScopeName={item.prompt.audience_scope_name}
				href={onCardClick ? undefined : `/conversations/${item.prompt.id}`}
				onclick={onCardClick ? () => onCardClick(item.prompt.id) : undefined}
			/>
		{/each}
	</div>
</div>

<style>
	.sheet {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg-canvas);
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
		width: 100%;
		max-width: 480px;
		max-height: 60vh;
		overflow-y: auto;
		padding: var(--space-5);
		padding-bottom: var(--nav-clearance);
	}

	.sheet.no-nav {
		padding-bottom: var(--space-5);
		box-sizing: border-box;
		z-index: 600;
	}

	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 599;
	}

	.sheet-close {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		width: 32px;
		height: 32px;
		border: none;
		background: var(--bg-control);
		border-radius: 50%;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}
	.sheet-close:hover {
		background: var(--bg-control-hover);
	}

	.sheet-body {
		display: flex;
		flex-direction: column;
	}

	@media (min-width: 769px) {
		.sheet {
			bottom: 0;
			border-radius: var(--radius-card) var(--radius-card) 0 0;
			max-width: 680px;
			max-height: 60vh;
		}
	}
</style>
