<script lang="ts">
	import type { PageData } from './$types';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import MapView from '$lib/components/MapView.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import { getWeekDates } from '$lib/utils/dates';
	import type { Snapshot } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();
	let viewMode = $state<'list' | 'map'>('list');
	let mapCenter = $state<[number, number] | null>(null);
	let mapZoom = $state<number | null>(null);

	export const snapshot: Snapshot<{ center: [number, number] | null; zoom: number | null; viewMode: 'list' | 'map' }> = {
		capture: () => ({ center: mapCenter, zoom: mapZoom, viewMode }),
		restore: (value) => { mapCenter = value.center; mapZoom = value.zoom; viewMode = value.viewMode; }
	};
	let searchOpen = $state(false);
	let selectedPinPrompts = $state<PromptSummary[]>([]);
	let selectedPinArea = $state('');

	function handlePinSelect(prompts: PromptSummary[], area: string) {
		selectedPinPrompts = prompts;
		selectedPinArea = area;
	}

	function closeSheet() {
		selectedPinPrompts = [];
		selectedPinArea = '';
	}

	const weekDates = getWeekDates();

	// Collect unique neighbourhoods from all prompts' slots
	const availableAreas = $derived.by(() => {
		const areas = new Set<string>();
		for (const p of data.prompts) {
			for (const s of p.available_slots) {
				if (s.general_area) areas.add(s.general_area);
			}
		}
		return [...areas].sort();
	});

	// Filter state
	let selectedDates = $state<Set<string>>(new Set());
	let selectedAreas = $state<Set<string>>(new Set());

	let hasFilters = $derived(selectedDates.size > 0 || selectedAreas.size > 0);

	/** Check if a slot falls on one of the selected dates */
	function slotMatchesDate(slot: TimeSlot, dates: Set<string>): boolean {
		if (dates.size === 0) return true;
		const slotDate = new Date(slot.start_time).toLocaleDateString('sv-SE');
		return dates.has(slotDate);
	}

	/** Check if a slot is in one of the selected areas */
	function slotMatchesArea(slot: TimeSlot, areas: Set<string>): boolean {
		if (areas.size === 0) return true;
		return areas.has(slot.general_area);
	}

	let filteredPrompts = $derived.by(() => {
		if (!hasFilters) return data.prompts;
		return data.prompts.filter((p) =>
			p.available_slots.some(
				(s) => slotMatchesDate(s, selectedDates) && slotMatchesArea(s, selectedAreas)
			)
		);
	});

	function toggleDate(date: string) {
		const next = new Set(selectedDates);
		if (next.has(date)) next.delete(date);
		else next.add(date);
		selectedDates = next;
	}

	function clearFilters() {
		selectedDates = new Set();
		selectedAreas = new Set();
	}

	/** Format slot dates for display, e.g. "Fri 28 · Sat 29" */
	function formatSlotDates(slots: TimeSlot[]): string {
		const dates = new Set<string>();
		for (const s of slots) {
			const d = new Date(s.start_time);
			dates.add(
				d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
			);
		}
		return [...dates].join(' · ');
	}

	/** Format a single slot's time, e.g. "7:30 PM" */
	function formatSlotTime(slot: TimeSlot): string {
		return new Date(slot.start_time).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

</script>

<svelte:head>
	<title>Discover - dyad.berlin</title>
</svelte:head>

{#if viewMode === 'map'}
	<div class="map-pane">
		<MapView
			prompts={filteredPrompts}
			onSelectPin={handlePinSelect}
			onMapClick={closeSheet}
			initialCenter={mapCenter}
			initialZoom={mapZoom}
			onMoveEnd={(c, z) => { mapCenter = c; mapZoom = z; }}
		/>
	</div>
	{#if selectedPinPrompts.length > 0}
		<BottomSheet prompts={selectedPinPrompts} />
	{/if}
{:else}
<div class="content">
			{#if data.prompts.length === 0}
				<div class="empty-state">
					<p>{copy.discover.noConversations}</p>
					<p class="empty-hint">{copy.discover.checkBackSoon}</p>
					<a href="/conversations/new" class="start-prompt-btn" style="margin-top: var(--space-4); display: inline-block;">{copy.discover.startConversation}</a>
				</div>
			{:else if filteredPrompts.length === 0}
					<div class="empty-state">
						<p>{copy.discover.noMatchingFilters}</p>
						<button class="clear-filters-link" onclick={clearFilters}>{copy.common.clearFilters}</button>
					</div>
				{:else}
					<div class="prompt-list">
						{#each filteredPrompts as prompt}
							<a href="/conversations/{prompt.id}" class="prompt-item">
								<div class="prompt-row">
									<div class="row-thumb">
										{#if prompt.cover_image_url}
											<img src={prompt.cover_image_url} alt="" class="thumb-img" />
										{:else}
											<div class="thumb-placeholder"></div>
										{/if}
									</div>
									<div class="row-body">
										<div class="row-top">
											<h3 class="row-title">{prompt.title ?? copy.common.untitled}</h3>
											<span class="date">{formatSlotDates(prompt.available_slots)}</span>
										</div>
										{#if prompt.body_snippet}
											<p class="row-snippet">{prompt.body_snippet}</p>
										{/if}
										<div class="row-meta">
											<span class="area">{prompt.available_slots.map((s) => s.general_area).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span>
											<span class="author">@{prompt.author_username}</span>
										</div>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
		</div>
	{/if}

<div class="floating-nav-wrapper">
	<FloatingNav
		variant="discover"
		active={viewMode === 'map' ? 'map' : ''}
		attentionCount={data.attentionCount ?? 0}
		onMapClick={() => viewMode = viewMode === 'map' ? 'list' : 'map'}
		{weekDates}
		selectedDays={selectedDates}
		onToggleDay={toggleDate}
		showDateFilter={true}
		onSearchClick={() => searchOpen = true}
	/>
</div>

{#if searchOpen}
	<SearchOverlay
		prompts={data.prompts}
		onClose={() => searchOpen = false}
		onSelect={(id) => { searchOpen = false; goto(`/conversations/${id}`); }}
	/>
{/if}

<style>
	.floating-nav-wrapper { display: block; }
	.map-pane {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
	}

	.content {
		width: 100%;
		max-width: var(--content-wide);
		padding-bottom: 80px; /* Space for bottom-anchored FloatingNav */
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--text-muted);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.empty-hint {
		font-size: var(--text-base);
	}

	.clear-filters-link {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: var(--text-base);
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
	}

	.clear-filters-link:hover { color: var(--text-primary); }

	/* === Prompt list === */
	.prompt-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: 2rem;
		margin-bottom: 3rem;
	}

	.start-prompt-btn {
				font-size: var(--text-sm);
		padding: var(--space-2) var(--space-5);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-input);
		background: var(--text-primary);
		color: var(--bg-canvas);
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.start-prompt-btn:hover { opacity: var(--opacity-hover-btn); }

	.prompt-item {
		border-bottom: 1px solid var(--border-link);
		text-decoration: none;
		color: inherit;
		display: block;
		transition: opacity 0.15s;
	}

	.prompt-item:hover { opacity: var(--opacity-hover-card); }

	.prompt-item:last-child {
		border-bottom: none;
	}

	.prompt-row {
		display: flex;
		gap: var(--space-5);
		padding: var(--space-6) 0;
		text-decoration: none;
		transition: background 0.15s;
		align-items: stretch;
	}

	.prompt-row:hover {
		background: var(--bg-control);
		margin: 0 calc(-1 * var(--space-3));
		padding-left: var(--space-3);
		padding-right: var(--space-3);
		border-radius: var(--radius-input);
	}

	.row-thumb {
		position: relative;
		flex-shrink: 0;
		width: 88px;
		min-height: 96px;
		border-radius: var(--radius-input);
		overflow: hidden;
		align-self: stretch;
	}

	/* .thumb-img — shared.css */

	.thumb-placeholder {
		position: absolute;
		inset: 0;
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		border-radius: inherit;
	}

	.row-body {
		flex: 1;
		min-width: 0;
	}

	.row-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-3);
	}

	.row-title {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.3;
		min-width: 0;
	}

	.date {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: var(--text-sm);
		white-space: nowrap;
	}

	.row-snippet {
		margin: var(--space-1) 0 0;
		color: var(--text-secondary);
		font-size: var(--text-base);
		line-height: 1.55;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.row-meta {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		margin-top: var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.author {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}

	.area {
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	@media (max-width: 430px) {
		.prompt-row {
			align-items: stretch;
		}

		.row-thumb {
			width: 88px;
			align-self: stretch;
		}

		.row-top {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}

		.date {
			font-size: var(--text-xs);
			color: var(--text-muted);
		}
	}
</style>
