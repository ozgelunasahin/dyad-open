<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';

	export interface BottomSheetItem {
		prompt: PromptSummary;
		/** When set (typically from a clicked map pin), the card shows the dates
		 *  and area for these specific slots instead of falling back to
		 *  `prompt.soonest_slot`. */
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
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	/** Distinct day labels for a set of slots, e.g. "Tue 12 May · Wed 13 May". */
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
			{@const prompt = item.prompt}
			{@const slotsLabel = item.slots && item.slots.length > 0 ? formatSlotDates(item.slots) : null}
			{@const dateLabel = slotsLabel ?? (prompt.soonest_slot ? formatDate(prompt.soonest_slot) : null)}
			{@const areaLabel = item.slots?.[0]?.general_area ?? null}
			{#snippet cardContent()}
				{#if prompt.cover_image_url}
					<div class="card-cover">
						<img src={prompt.cover_image_url} alt="" class="card-cover-img" loading="lazy" />
					</div>
				{/if}
				<div class="card-content">
					<!-- Forum-style: the title is the hero teaser. -->
					<h4 class="card-title">{prompt.title}</h4>
					{#if prompt.body_snippet}
						<p class="card-snippet">{prompt.body_snippet}</p>
					{/if}
					<div class="card-meta">
						{#if dateLabel}
							<span class="meta-date">{dateLabel}</span>
						{/if}
						{#if areaLabel}
							<span class="meta-area">{areaLabel}</span>
						{/if}
						<span class="meta-author" class:anonymised={hideAuthor}>
							@{hideAuthor ? prompt.author_username.replace(/./g, '•') : prompt.author_username}
						</span>
					</div>
					{#if prompt.audience_scope_name}
						<span class="audience-tag">{prompt.audience_scope_name}</span>
					{/if}
				</div>
			{/snippet}

			{#if onCardClick}
				<button class="sheet-card" onclick={() => onCardClick(prompt.id)}>
					{@render cardContent()}
				</button>
			{:else}
				<a href="/conversations/{prompt.id}" class="sheet-card">
					{@render cardContent()}
				</a>
			{/if}
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
		z-index: 850;
	}

	.sheet.no-nav {
		padding-bottom: var(--space-5);
		box-sizing: border-box;
		z-index: 600;
	}

	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 849;
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
	.sheet-close:hover { background: var(--bg-control-hover); }

	.sheet-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* dice.fm-style card: soft-rounded cover image, title + meta as plain text
	   below it. No box, no border — the image and the title do the talking. */
	.sheet-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: 0;
		border: none;
		background: none;
		text-decoration: none;
		text-align: left;
		color: inherit;
		width: 100%;
		cursor: pointer;
	}

	.sheet-card:hover .card-cover-img { opacity: var(--opacity-hover-card); }
	.sheet-card:hover .card-title { text-decoration: underline; }

	.card-cover {
		width: 100%;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: var(--radius-card);
	}

	.card-cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: opacity 0.15s;
	}

	.card-content { min-width: 0; }

	/* Title is the teaser — like a dice/forum thread title. */
	.card-title {
		font-size: var(--text-md);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-1);
		line-height: var(--leading-tight);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-snippet {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0 0 var(--space-1);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.meta-date {
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}

	.meta-area {
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.meta-author.anonymised {
		filter: blur(4px);
		user-select: none;
	}

	.audience-tag {
		display: inline-block;
		margin-top: var(--space-1);
		font-size: var(--text-xs);
		font-style: italic;
		color: var(--text-muted);
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
