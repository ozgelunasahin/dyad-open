<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import type { PageData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';

	let { data }: { data: PageData } = $props();
	let mobileMenuOpen = $state(false);

	// 7-day calendar starting from today
	const weekDates = (() => {
		const today = new Date();
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(today);
			d.setDate(today.getDate() + i);
			return {
				date: d.toISOString().split('T')[0],
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
		const slotDate = new Date(slot.start_time).toISOString().split('T')[0];
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

	// --- Post-meeting feedback modal ---
	let activeFeedback = $state(
		data.pendingFeedback && data.pendingFeedback.length > 0 ? data.pendingFeedback[0] : null
	);

	function dismissFeedback() {
		const idx = activeFeedback
			? data.pendingFeedback.findIndex((f) => f.meetingId === activeFeedback!.meetingId)
			: -1;
		const next = data.pendingFeedback[idx + 1] ?? null;
		activeFeedback = next;
	}
</script>

<svelte:head>
	<title>Discover - dyad.berlin</title>
</svelte:head>

<div class="app-layout">
	<aside class="sidebar">
		<a href="/discover" class="sidebar-logo">
			<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt="dyad" class="sidebar-logo-img" />
		</a>
		<nav class="sidebar-nav">
			<a href="/discover" class="sidebar-link active">Discover</a>
			<a href="/dashboard" class="sidebar-link">Profile</a>
			{#if data.canPublishSites}
				<a href="/dashboard#admin" class="sidebar-link">Admin</a>
			{/if}
		</nav>
		<div class="sidebar-bottom">
			<span class="sidebar-username">@{data.username}</span>
			<a href="/logout" class="sidebar-logout">sign out</a>
		</div>
		<button class="mobile-menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Menu">
			{#if mobileMenuOpen}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{/if}
		</button>
	</aside>
	{#if mobileMenuOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="mobile-overlay" onclick={() => mobileMenuOpen = false}></div>
		<aside class="mobile-panel" transition:fly={{ x: 300, duration: 250 }}>
			<nav class="mobile-panel-nav">
				<a href="/dashboard" onclick={() => mobileMenuOpen = false}>dashboard</a>
			</nav>
			<div class="mobile-panel-bottom">
				<span class="mobile-panel-user">@{data.username}</span>
				<a href="/logout" onclick={() => mobileMenuOpen = false}>sign out</a>
			</div>
		</aside>
	{/if}

	{#if activeFeedback}
		<FeedbackModal
			meetingId={activeFeedback.meetingId}
			otherUsername={activeFeedback.otherUsername}
			onclose={dismissFeedback}
			onsubmitted={dismissFeedback}
		/>
	{/if}

	<main class="main-content">
		<div class="content">
			{#if data.prompts.length === 0}
				<div class="empty-state">
					<p>No prompts available right now.</p>
					<p class="empty-hint">Check back soon, or start your own.</p>
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
				</div>

				{#if filteredPrompts.length === 0}
					<div class="empty-state">
						<p>No prompts match your filters.</p>
						<button class="clear-filters-link" onclick={clearFilters}>Clear filters</button>
					</div>
				{:else}
					<div class="prompt-list">
						{#each filteredPrompts as prompt}
							<div class="prompt-item">
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
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>

<style>
	:global(body) {
		overflow: auto !important;
	}

	.app-layout {
		display: flex;
		min-height: 100vh;
		background: var(--bg-canvas);
	}

	.sidebar {
		width: 180px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 1.5rem 1.25rem;
		border-right: 1px solid var(--border-link);
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
	}

	.sidebar-logo {
		display: block;
		margin-bottom: 1.25rem;
		padding: 0 0.65rem;
	}

	.sidebar-logo-img {
		width: 22px;
		height: auto;
		object-fit: contain;
		filter: brightness(0) opacity(0.4);
	}

	:global([data-theme='dark']) .sidebar-logo-img {
		filter: brightness(0) invert(1) opacity(0.7);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sidebar-link {
		display: block;
		padding: 0.5rem 0.65rem;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		border-radius: 4px;
		transition: color 0.15s, background 0.15s;
	}

	.sidebar-link:hover {
		color: var(--text-primary);
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
	}

	.sidebar-link.active {
		color: var(--text-primary);
		font-weight: 500;
	}

	.sidebar-bottom {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sidebar-username {
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: monospace;
	}

	.sidebar-logout {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.8rem;
		transition: color 0.2s;
	}

	.sidebar-logout:hover {
		color: var(--text-primary);
	}

	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-primary, #1a1a1a);
		align-items: center;
		justify-content: center;
	}

	.mobile-overlay, .mobile-panel {
		display: none;
	}

	.main-content {
		flex: 1;
		min-width: 0;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.content {
		width: 100%;
		max-width: 800px;
	}

	@media (max-width: 430px) {
		.app-layout {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
			height: auto;
			position: static;
			flex-direction: row;
			align-items: center;
			padding: 1rem 1.5rem;
			border-right: none;
			border-bottom: 1px solid var(--border-link);
			gap: 1rem;
		}

		.sidebar-logo { margin-bottom: 0; padding: 0; }
		.sidebar-logo-img { width: 28px; }
		.sidebar-nav { display: none; }
		.sidebar-bottom { display: none; }

		.mobile-menu-btn {
			display: flex;
			margin-left: auto;
		}

		.mobile-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.15);
			z-index: 200;
		}

		.mobile-panel {
			display: flex;
			flex-direction: column;
			position: fixed;
			top: 0;
			right: 0;
			width: 280px;
			max-width: 80vw;
			height: 100vh;
			background: var(--bg-canvas, #f5f3f0);
			z-index: 300;
			padding: 24px;
			box-sizing: border-box;
			box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
		}

		.mobile-panel-nav {
			display: flex;
			flex-direction: column;
			gap: 0;
			margin-top: 32px;
		}

		.mobile-panel-nav a {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 18px;
			font-weight: 500;
			color: var(--text-primary, #1a1a1a);
			text-decoration: none;
			padding: 14px 0;
			border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		}

		.mobile-panel-bottom {
			margin-top: auto;
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.mobile-panel-user {
			font-family: monospace;
			font-size: 13px;
			color: var(--text-muted, #666);
		}

		.mobile-panel-bottom a {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 16px;
			color: var(--text-secondary, #333);
			text-decoration: none;
		}
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

	.prompt-item {
		border-bottom: 1px solid var(--border-link);
	}

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
