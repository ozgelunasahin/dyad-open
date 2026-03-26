<script lang="ts">
	import type { PageData } from './$types';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import MapView from '$lib/components/MapView.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';

	let { data }: { data: PageData } = $props();
	let viewMode = $state<'list' | 'map'>('list');
	let selectedPinPrompts = $state<PromptSummary[]>([]);
	let selectedPinArea = $state('');

	function handlePinSelect(prompts: PromptSummary[], area: string) {
		selectedPinPrompts = prompts;
		selectedPinArea = area;
	}

	function handlePinNavigate(promptId: string) {
		goto(`/prompts/${promptId}`);
	}

	function closeSheet() {
		selectedPinPrompts = [];
		selectedPinArea = '';
	}

	// 7-day calendar starting from today
	const weekDates = (() => {
		const today = new Date();
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
			return {
				date: d.toLocaleDateString('sv-SE'),
				dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
				dayNum: d.getDate()
			};
		});
	})();

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
	let areaQuery = $state('');
	let areaDropdownOpen = $state(false);

	let areaSuggestions = $derived.by(() => {
		if (!areaQuery.trim()) return availableAreas;
		const q = areaQuery.toLowerCase();
		return availableAreas.filter((a) => a.toLowerCase().includes(q));
	});

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

	function toggleArea(area: string) {
		const next = new Set(selectedAreas);
		if (next.has(area)) next.delete(area);
		else next.add(area);
		selectedAreas = next;
		areaQuery = '';
		areaDropdownOpen = false;
	}

	function removeArea(area: string) {
		const next = new Set(selectedAreas);
		next.delete(area);
		selectedAreas = next;
	}

	function clearFilters() {
		selectedDates = new Set();
		selectedAreas = new Set();
		areaQuery = '';
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

<div class="content">
			{#if data.prompts.length === 0}
				<div class="empty-state">
					<p>No conversations available right now.</p>
					<p class="empty-hint">Check back soon, or start your own.</p>
					<a href="/prompts/new" class="start-prompt-btn" style="margin-top: 16px; display: inline-block;">Start a conversation</a>
				</div>
			{:else}
				<div class="filter-bar">
					<div class="filter-group">
						<span class="filter-label">When</span>
						<div class="week-calendar">
							{#each weekDates as day}
								<button
									type="button"
									class="day-cell"
									class:selected={selectedDates.has(day.date)}
									onclick={() => toggleDate(day.date)}
								>
									<span class="day-name">{day.dayShort}</span>
									<span class="day-num">{day.dayNum}</span>
								</button>
							{/each}
						</div>
					</div>
					<div class="filter-group where-group">
						<span class="filter-label">Where</span>
						<div class="location-filter">
							{#each [...selectedAreas] as area}
								<span class="location-chip">
									{area}
									<button class="chip-remove" onclick={() => removeArea(area)}>&times;</button>
								</span>
							{/each}
							<div class="location-search">
								<input
									type="text"
									class="location-input"
									placeholder={selectedAreas.size > 0 ? 'Add area...' : 'Search neighbourhood...'}
									value={areaQuery}
									oninput={(e) => { areaQuery = (e.target as HTMLInputElement).value; areaDropdownOpen = true; }}
									onfocus={() => { areaDropdownOpen = true; }}
									onblur={() => { setTimeout(() => { areaDropdownOpen = false; }, 150); }}
								/>
								{#if areaDropdownOpen && areaSuggestions.length > 0}
									<div class="location-dropdown">
										{#each areaSuggestions as suggestion}
											<button
												type="button"
												class="location-option"
												class:active={selectedAreas.has(suggestion)}
												onmousedown={(e) => { e.preventDefault(); toggleArea(suggestion); }}
											>{suggestion}</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
					{#if hasFilters}
						<button class="clear-filters" onclick={clearFilters}>Clear all</button>
					{/if}

					<div class="view-toggle">
						<button class="toggle-btn" class:active={viewMode === 'list'} onclick={() => viewMode = 'list'} title="List view">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
						</button>
						<button class="toggle-btn" class:active={viewMode === 'map'} onclick={() => viewMode = 'map'} title="Map view">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 3l5-2 4 2 5-2v12l-5 2-4-2-5 2V3z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 1v12M10 3v12" stroke="currentColor" stroke-width="1.2"/></svg>
						</button>
					</div>
				</div>

				<div class="prompt-actions">
					<a href="/prompts/new" class="start-prompt-btn">Start a conversation</a>
				</div>

				{#if viewMode === 'map'}
					<MapView prompts={filteredPrompts} onSelectPin={handlePinSelect} onNavigate={handlePinNavigate} />
					{#if selectedPinPrompts.length > 0}
						<BottomSheet prompts={selectedPinPrompts} area={selectedPinArea} onClose={closeSheet} />
					{/if}
				{:else if filteredPrompts.length === 0}
					<div class="empty-state">
						<p>No conversations match your filters.</p>
						<button class="clear-filters-link" onclick={clearFilters}>Clear filters</button>
					</div>
				{:else}
					<div class="prompt-list">
						{#each filteredPrompts as prompt}
							<a href="/prompts/{prompt.id}" class="prompt-item">
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
											<h3 class="row-title">{prompt.title ?? 'Untitled'}</h3>
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
			{/if}
		</div>

<div class="floating-nav-wrapper">
	<FloatingNav
		position="top"
		active={viewMode === 'map' ? 'map' : ''}
		onMapClick={() => viewMode = viewMode === 'map' ? 'list' : 'map'}
		{weekDates}
		selectedDays={selectedDates}
		onToggleDay={toggleDate}
		showDateFilter={true}
	/>
</div>

<style>
	.floating-nav-wrapper { display: block; }
	.content {
		width: 100%;
		max-width: 800px;
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
		font-size: 0.9rem;
	}

	/* === Filter bar === */
	.filter-bar {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border-link);
		border-radius: 8px;
		background: var(--bg-canvas);
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-label {
		font-size: 0.8rem;
		color: var(--text-muted);
		flex-shrink: 0;
		width: 40px;
	}

	.week-calendar {
		display: flex;
		gap: 0.25rem;
		flex: 1;
	}

	.day-cell {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.05rem;
		padding: 0.35rem 0.15rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.15s, background 0.15s, color 0.15s;
		color: var(--text-primary);
	}

	.day-cell:hover {
		border-color: var(--border-link-hover, var(--text-muted));
	}

	.day-cell.selected {
		background: var(--text-primary);
		border-color: var(--text-primary);
		color: var(--bg-canvas);
	}

	.day-name {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.day-num {
		font-size: 0.85rem;
		font-weight: 500;
	}

	.location-filter {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex: 1;
		flex-wrap: wrap;
	}

	.location-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.2rem 0.5rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-radius: 12px;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.chip-remove {
		background: none;
		border: none;
		color: var(--bg-canvas);
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		opacity: 0.7;
	}

	.chip-remove:hover { opacity: 1; }

	.location-search {
		position: relative;
		min-width: 140px;
		flex: 1;
	}

	.location-input {
		width: 100%;
		padding: 0.4rem 0.65rem;
		border: 1px solid var(--border-link);
		border-radius: 6px;
		font-size: 0.85rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.location-input:focus {
		outline: none;
		border-color: var(--text-link-hover, var(--text-muted));
	}

	.location-input::placeholder { color: var(--text-muted); }

	.location-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-top: none;
		border-radius: 0 0 6px 6px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.location-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.45rem 0.65rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link);
		font-size: 0.85rem;
		font-family: inherit;
		color: var(--text-primary);
		cursor: pointer;
	}

	.location-option:last-child { border-bottom: none; }
	.location-option:hover { background: var(--bg-control, rgba(0, 0, 0, 0.03)); }
	.location-option.active { background: var(--bg-control, rgba(0, 0, 0, 0.03)); font-weight: 500; }

	.clear-filters {
		align-self: flex-end;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
	}

	.clear-filters:hover { color: var(--text-primary); }

	.view-toggle {
		display: flex;
		gap: 2px;
		margin-left: auto;
	}

	.toggle-btn {
		padding: 6px 8px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		background: none;
		color: var(--text-muted, #999);
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: all 0.15s;
	}

	.toggle-btn:first-child { border-radius: 4px 0 0 4px; }
	.toggle-btn:last-child { border-radius: 0 4px 4px 0; }
	.toggle-btn.active { background: var(--text-primary); color: var(--bg-canvas); border-color: var(--text-primary); }
	.toggle-btn:hover:not(.active) { border-color: var(--text-primary); color: var(--text-primary); }

	.clear-filters-link {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
	}

	.clear-filters-link:hover { color: var(--text-primary); }

	.where-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* === Prompt list === */
	.prompt-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: 2rem;
		margin-bottom: 3rem;
	}

	.prompt-actions {
		margin-bottom: 16px;
	}

	.start-prompt-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		padding: 8px 20px;
		border: 1px solid var(--text-primary, #1a1a1a);
		border-radius: 6px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.start-prompt-btn:hover { opacity: 0.8; }

	.prompt-item {
		border-bottom: 1px solid var(--border-link);
		text-decoration: none;
		color: inherit;
		display: block;
		transition: opacity 0.15s;
	}

	.prompt-item:hover { opacity: 0.72; }

	.prompt-item:last-child {
		border-bottom: none;
	}

	.prompt-row {
		display: flex;
		gap: 1.25rem;
		padding: 1.5rem 0;
		text-decoration: none;
		transition: background 0.15s;
		align-items: stretch;
	}

	.prompt-row:hover {
		background: var(--bg-control, rgba(0, 0, 0, 0.02));
		margin: 0 -0.75rem;
		padding-left: 0.75rem;
		padding-right: 0.75rem;
		border-radius: 4px;
	}

	.row-thumb {
		position: relative;
		flex-shrink: 0;
		width: 88px;
		min-height: 96px;
		border-radius: 6px;
		overflow: hidden;
		align-self: stretch;
	}

	.thumb-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumb-placeholder {
		position: absolute;
		inset: 0;
		background: var(--bg-control, rgba(0, 0, 0, 0.05));
		border: 1px solid var(--border-link);
	}

	.row-body {
		flex: 1;
		min-width: 0;
	}

	.row-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
	}

	.row-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.3;
		min-width: 0;
	}

	.date {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.row-snippet {
		margin: 0.4rem 0 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.55;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.row-meta {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-top: 0.35rem;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.author {
		font-family: monospace;
		font-size: 0.78rem;
	}

	.area {
		font-size: 0.78rem;
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
			gap: 0.2rem;
		}

		.date {
			font-size: 0.75rem;
			color: var(--text-muted);
		}
	}
</style>
