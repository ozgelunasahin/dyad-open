<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import type { PageData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import MapView from '$lib/components/MapView.svelte';

	let { data }: { data: PageData } = $props();
	let mobileMenuOpen = $state(false);
	let viewMode = $state<'list' | 'map'>('list');

	function formatDate(date: string): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric'
		}).format(new Date(date));
	}

	// 7-day calendar starting from today
	const weekDates = (() => {
		const today = new Date();
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(today);
			d.setDate(today.getDate() + i);
			return {
				date: d.toISOString().split('T')[0],
				dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
				dayNum: d.getDate(),
				// The label that conversations store, e.g. "Sat 15"
				label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
			};
		});
	})();

	// Berlin postcodes for the dropdown
	const BERLIN_POSTCODES = [
		'10115 Mitte', '10178 Mitte',
		'10243 Friedrichshain', '10245 Friedrichshain', '10247 Friedrichshain',
		'10249 Prenzlauer Berg', '10405 Prenzlauer Berg', '10435 Prenzlauer Berg', '10437 Prenzlauer Berg',
		'10551 Moabit', '10623 Charlottenburg', '10785 Tiergarten',
		'10961 Kreuzberg', '10965 Kreuzberg', '10967 Kreuzberg', '10997 Kreuzberg', '10999 Kreuzberg',
		'12043 Neukölln', '12045 Neukölln', '12047 Neukölln', '12049 Neukölln', '12053 Neukölln',
		'12099 Tempelhof', '13347 Wedding', '13353 Wedding',
	];

	// Filter state — multi-select
	let selectedDays = $state<Set<string>>(new Set());
	let selectedLocations = $state<Set<string>>(new Set());
	let locationQuery = $state('');
	let locationDropdownOpen = $state(false);

	let locationSuggestions = $derived.by(() => {
		if (!locationQuery.trim()) return BERLIN_POSTCODES;
		const q = locationQuery.toLowerCase();
		return BERLIN_POSTCODES.filter(l => l.toLowerCase().includes(q));
	});

	let hasFilters = $derived(selectedDays.size > 0 || selectedLocations.size > 0);

	let filteredConversations = $derived.by(() => {
		let results = data.conversations;
		if (selectedDays.size > 0) {
			results = results.filter((c) => c.days.some(d => selectedDays.has(d)));
		}
		if (selectedLocations.size > 0) {
			results = results.filter((c) => c.locations.some(l => selectedLocations.has(l)));
		}
		return results;
	});

	function toggleDay(label: string) {
		const next = new Set(selectedDays);
		if (next.has(label)) next.delete(label);
		else next.add(label);
		selectedDays = next;
	}

	function toggleLocation(loc: string) {
		const next = new Set(selectedLocations);
		if (next.has(loc)) next.delete(loc);
		else next.add(loc);
		selectedLocations = next;
		locationQuery = '';
		locationDropdownOpen = false;
	}

	function removeLocation(loc: string) {
		const next = new Set(selectedLocations);
		next.delete(loc);
		selectedLocations = next;
	}

	function clearFilters() {
		selectedDays = new Set();
		selectedLocations = new Set();
		locationQuery = '';
	}

	// --- Post-meeting feedback modal ---
	// Show the first pending feedback on load
	let activeFeedback = $state(
		data.pendingFeedback && data.pendingFeedback.length > 0 ? data.pendingFeedback[0] : null
	);

	function dismissFeedback() {
		// Move to next pending or clear
		const idx = activeFeedback
			? data.pendingFeedback.findIndex((f) => f.meetingId === activeFeedback!.meetingId)
			: -1;
		const next = data.pendingFeedback[idx + 1] ?? null;
		activeFeedback = next;
	}

	// --- Comment + invite flow ---
	let expandedId = $state<string | null>(null);
	let commentText = $state('');
	let submitting = $state(false);
	let inviting = $state(false);
	let commentedSet = $state<Set<string>>(new Set());
	let invitedSet = $state<Set<string>>(new Set());
	let panelError = $state('');

	function toggleCard(id: string, username: string, slug: string) {
		window.location.href = `/@${username}/${slug}`;
	}

	async function submitComment(canvasId: string) {
		if (!commentText.trim() || submitting) return;
		submitting = true;
		panelError = '';
		try {
			const res = await fetch('/api/canvas-comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ canvas_id: canvasId, body: commentText })
			});
			if (res.ok) {
				commentedSet = new Set([...commentedSet, canvasId]);
				commentText = '';
			} else {
				const err = await res.json().catch(() => ({}));
				panelError = (err as any).message ?? 'Failed to send note';
			}
		} finally {
			submitting = false;
		}
	}

	async function sendInvite(canvasId: string, inviteeId: string) {
		if (inviting) return;
		inviting = true;
		panelError = '';
		try {
			const res = await fetch('/api/meetings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ canvas_id: canvasId, invitee_id: inviteeId })
			});
			if (res.ok) {
				invitedSet = new Set([...invitedSet, canvasId]);
			} else {
				const err = await res.json().catch(() => ({}));
				panelError = (err as any).message ?? 'Failed to send invite';
			}
		} finally {
			inviting = false;
		}
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
			{#if data.conversations.length === 0}
				<div class="empty-state">
					<p>No active conversations this week.</p>
					<p class="empty-hint">Check back soon, or start your own from the dashboard.</p>
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
									class:selected={selectedDays.has(day.label)}
									onclick={() => toggleDay(day.label)}
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
							{#each [...selectedLocations] as loc}
								<span class="location-chip">
									{loc}
									<button class="chip-remove" onclick={() => removeLocation(loc)}>&times;</button>
								</span>
							{/each}
							<div class="location-search">
								<input
									type="text"
									class="location-input"
									placeholder={selectedLocations.size > 0 ? 'Add postcode...' : 'Search postcode...'}
									value={locationQuery}
									oninput={(e) => { locationQuery = (e.target as HTMLInputElement).value; locationDropdownOpen = true; }}
									onfocus={() => { locationDropdownOpen = true; }}
									onblur={() => { setTimeout(() => { locationDropdownOpen = false; }, 150); }}
								/>
								{#if locationDropdownOpen && locationSuggestions.length > 0}
									<div class="location-dropdown">
										{#each locationSuggestions as suggestion}
											<button
												type="button"
												class="location-option"
												class:active={selectedLocations.has(suggestion)}
												onmousedown={(e) => { e.preventDefault(); toggleLocation(suggestion); }}
											>{suggestion}</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>
						<button
							class="map-toggle-btn"
							class:active={viewMode === 'map'}
							onclick={() => viewMode = viewMode === 'map' ? 'list' : 'map'}
							title={viewMode === 'map' ? 'Switch to list' : 'Switch to map'}
						>
							{#if viewMode === 'map'}
								<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
									<rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/>
									<rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/>
									<rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/>
								</svg>
							{:else}
								<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
									<path d="M1 3l4 1.5L9 3l6 2v8l-6-2-4 1.5L1 11V3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
									<path d="M5 4.5v9M9 3v8" stroke="currentColor" stroke-width="1.4"/>
								</svg>
							{/if}
						</button>
					</div>
					{#if hasFilters}
						<button class="clear-filters" onclick={clearFilters}>Clear all</button>
					{/if}
				</div>

				{#if filteredConversations.length === 0 && viewMode !== 'map'}
					<div class="empty-state">
						<p>No conversations match your filters.</p>
						<button class="clear-filters-link" onclick={clearFilters}>Clear filters</button>
					</div>
				{:else}
					<div class="conversation-list">
						{#each filteredConversations as conversation}
							<div class="conversation-item">
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="conversation-row"
									class:expanded={expandedId === conversation.id}
									role="button"
									tabindex="0"
									onclick={() => toggleCard(conversation.id, conversation.username, conversation.slug)}
									onkeydown={(e) => e.key === 'Enter' && toggleCard(conversation.id, conversation.username, conversation.slug)}
								>
									<div class="row-thumb">
										{#if conversation.coverImageUrl}
											<img src={conversation.coverImageUrl} alt="" class="thumb-img" />
										{:else}
											<div class="thumb-placeholder"></div>
										{/if}
									</div>
									<div class="row-body">
										<div class="row-top">
											<h3 class="row-title">{conversation.name}</h3>
											<span class="date">{conversation.days.length > 0 ? conversation.days.join(' · ') : formatDate(conversation.updatedAt)}</span>
										</div>
										{#if conversation.snippet}
											<p class="row-snippet">{conversation.snippet}</p>
										{/if}
									</div>
								</div>

								{#if expandedId === conversation.id}
									<div class="comment-panel" transition:slide={{ duration: 180 }}>
										{#if invitedSet.has(conversation.id)}
											<p class="panel-success">Invite sent to @{conversation.username} — they'll be notified.</p>
										{:else if commentedSet.has(conversation.id)}
											<p class="panel-success">Your note was sent.</p>
											<button
												class="invite-btn"
												onclick={() => sendInvite(conversation.id, conversation.userId)}
												disabled={inviting}
											>
												{inviting ? 'Sending...' : `Invite @${conversation.username} to meet in person →`}
											</button>
										{:else}
											<textarea
												class="comment-input"
												placeholder="Leave a note on this conversation..."
												value={commentText}
												oninput={(e) => commentText = (e.target as HTMLTextAreaElement).value}
												rows={3}
											></textarea>
											{#if panelError}
												<p class="panel-error">{panelError}</p>
											{/if}
											<div class="comment-actions">
												<a href="/@{conversation.username}/{conversation.slug}" class="view-link">View full conversation</a>
												<button
													class="submit-btn"
													onclick={() => submitComment(conversation.id)}
													disabled={submitting || !commentText.trim()}
												>{submitting ? 'Sending...' : 'Send note'}</button>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</main>
	{#if viewMode === 'map'}
		<MapView
			conversations={filteredConversations}
			weekDates={weekDates}
			selectedDays={selectedDays}
			onToggleDay={toggleDay}
			onClose={() => viewMode = 'list'}
		/>
	{/if}
</div>

<style>
	:global(body) {
		overflow: auto !important;
	}

	/* === App layout with sidebar === */
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

	/* Hamburger — hidden on desktop */
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

	/* Slide-in panel — hidden on desktop */
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

	.page-header {
		margin-bottom: 2rem;
		width: 100%;
		max-width: 800px;
	}

	.page-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0.25rem 0 0;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.content {
		width: 100%;
		max-width: 800px;
	}

	/* Mobile: sidebar becomes top bar */
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

		.sidebar-logo {
			margin-bottom: 0;
			padding: 0;
		}

		.sidebar-logo-img {
			width: 28px;
			height: auto;
		}

		.sidebar-nav {
			display: none;
		}

		.sidebar-bottom {
			display: none;
		}

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
			transition: color 0.15s;
		}

		.mobile-panel-nav a:hover {
			color: var(--text-muted, #666);
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
			transition: color 0.15s;
		}

		.mobile-panel-bottom a:hover {
			color: var(--text-primary, #1a1a1a);
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

	/* Week calendar in filter bar */
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

	/* Location filter with chips + search */
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

	.chip-remove:hover {
		opacity: 1;
	}

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

	.location-input::placeholder {
		color: var(--text-muted);
	}

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

	.location-option:last-child {
		border-bottom: none;
	}

	.location-option:hover {
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
	}

	.location-option.active {
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
		font-weight: 500;
	}

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

	.clear-filters:hover {
		color: var(--text-primary);
	}

	.clear-filters-link {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: underline;
	}

	.clear-filters-link:hover {
		color: var(--text-primary);
	}

	/* === Map toggle === */
	.where-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.map-toggle-btn {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border: 1px solid var(--border-link);
		border-radius: 6px;
		background: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, color 0.15s;
	}

	.map-toggle-btn:hover {
		background: var(--bg-control);
		color: var(--text-primary);
	}

	.map-toggle-btn.active {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-color: var(--text-primary);
	}

	/* === Conversation list === */
	.conversation-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: 2rem;
		margin-bottom: 3rem;
	}

	.conversation-row {
		display: flex;
		gap: 1.25rem;
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--border-link);
		text-decoration: none;
		transition: background 0.15s;
		align-items: stretch;
	}

	.conversation-row:last-child {
		border-bottom: none;
	}

	.conversation-row:hover {
		background: var(--bg-control, rgba(0, 0, 0, 0.02));
		margin: 0 -0.75rem;
		padding-left: 0.75rem;
		padding-right: 0.75rem;
		border-radius: 4px;
	}

	/* Thumbnail */
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

	/* Body */
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

	/* Responsive: stack on mobile */
	@media (max-width: 430px) {
		.conversation-row {
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

	/* === Expandable card & comment panel === */
	.conversation-item {
		border-bottom: 1px solid var(--border-link);
	}

	.conversation-item:last-child {
		border-bottom: none;
	}

	.conversation-row {
		cursor: pointer;
		border-bottom: none;
		user-select: none;
	}

	.conversation-row.expanded .row-title {
		color: var(--text-muted);
	}

	.comment-panel {
		padding: 0.75rem 0 1rem 108px; /* align with row body (thumb 88px + gap 20px) */
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.comment-input {
		width: 100%;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 6px;
		font-size: 0.88rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		resize: vertical;
		box-sizing: border-box;
		line-height: 1.5;
	}

	.comment-input:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.comment-input::placeholder {
		color: var(--text-muted);
	}

	.comment-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.view-link {
		font-size: 0.8rem;
		color: var(--text-muted);
		text-decoration: none;
	}

	.view-link:hover {
		color: var(--text-primary);
		text-decoration: underline;
	}

	.submit-btn {
		padding: 0.45rem 1rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.submit-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.submit-btn:not(:disabled):hover {
		opacity: 0.8;
	}

	.invite-btn {
		padding: 0.5rem 1.1rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.88rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
		align-self: flex-start;
	}

	.invite-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.invite-btn:not(:disabled):hover {
		opacity: 0.8;
	}

	.panel-success {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-muted);
	}

	.panel-error {
		margin: 0;
		font-size: 0.8rem;
		color: #c0392b;
	}
</style>
