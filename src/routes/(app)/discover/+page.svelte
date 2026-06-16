<script lang="ts">
	import type { PageData } from './$types';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import MapView from '$lib/components/MapView.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import ConversationCard from '$lib/components/ConversationCard.svelte';

	function slotDates(slots: { start_time: string }[]): string {
		const dates = new Set<string>();
		for (const s of slots) {
			const d = new Date(s.start_time);
			dates.add(d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
		}
		return [...dates].join(' · ');
	}

	function uniqueAreas(slots: { general_area: string }[]): string {
		return slots
			.map((s) => s.general_area)
			.filter((v, i, a) => a.indexOf(v) === i)
			.join(', ');
	}
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import { getWeekDates } from '$lib/utils/dates';
	import type { Snapshot } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	const ONBOARDING_KEY = 'dyad_onboarding_done';
	const isWelcome = browser && new URLSearchParams(window.location.search).get('welcome') === '1';
	// Guests (corner-exclusive members) skip the commons onboarding — its
	// framing is written for the Berlin commons, not a conference corner.
	let showOnboarding = $state(isWelcome && !data.isGuest && !localStorage.getItem(ONBOARDING_KEY));

	function finishOnboarding() {
		if (browser) localStorage.setItem(ONBOARDING_KEY, '1');
		showOnboarding = false;
		// Clean up the ?welcome=1 param from the URL without a page reload
		const url = new URL(window.location.href);
		url.searchParams.delete('welcome');
		window.history.replaceState({}, '', url);
	}
	let viewMode = $state<'list' | 'map'>('map');
	let mapCenter = $state<[number, number] | null>(null);
	let mapZoom = $state<number | null>(null);

	export const snapshot: Snapshot<{ center: [number, number] | null; zoom: number | null }> = {
		capture: () => ({ center: mapCenter, zoom: mapZoom }),
		restore: (value) => { mapCenter = value.center; mapZoom = value.zoom; }
	};
	let searchOpen = $state(false);
	let selectedPinItems = $state<PromptSummary[]>([]);

	function handlePinSelect(items: PromptSummary[], _area: string) {
		selectedPinItems = items;
	}

	function closeSheet() {
		selectedPinItems = [];
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

	// Slot-level predicate for the map: a Wednesday-only filter should drop the
	// Tuesday-Mitte pin even on conversations that have a Wednesday slot
	// elsewhere. `filteredPrompts` already narrows the conversation list; this
	// narrows the pin set within each conversation.
	let mapSlotFilter = $derived(
		hasFilters
			? (slot: TimeSlot) => slotMatchesDate(slot, selectedDates) && slotMatchesArea(slot, selectedAreas)
			: undefined
	);

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

	// Reset the BottomSheet selection whenever the filter state changes — otherwise
	// the sheet keeps displaying conversations that are no longer on the filtered
	// map. Per-slot pins make this gap more visible because clicks pull more items
	// into the sheet. Reading the Sets directly tracks identity reassignment
	// (toggleDate/clearFilters create new Set instances each time).
	$effect(() => {
		if (selectedDates && selectedAreas) {
			selectedPinItems = [];
		}
	});

	/** Format slot dates for display, e.g. "Fri 28 · Sat 29" */
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
		<div class="map-pane-inner">
			<MapView
				prompts={filteredPrompts}
				slotFilter={mapSlotFilter}
				onSelectPin={handlePinSelect}
				onMapClick={closeSheet}
				initialCenter={mapCenter ?? data.mapCenter}
				initialZoom={mapZoom}
				onMoveEnd={(c, z) => { mapCenter = c; mapZoom = z; }}
			/>
		</div>
	</div>
	{#if selectedPinItems.length > 0}
		{@const prompt = selectedPinItems[0]}
		<!-- Airbnb-style card floating over the map (same as the landing) -->
		<div class="map-card">
			<button class="map-card-close" onclick={closeSheet} aria-label="Close">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			</button>
			<a href="/conversations/{prompt.id}" class="map-card-link">
				{#if prompt.cover_image_url}
					<div class="map-card-cover">
						<img src={prompt.cover_image_url} alt="" />
					</div>
				{/if}
				<div class="map-card-body">
					<h3 class="map-card-title">{prompt.title}</h3>
					<div class="map-card-meta">
						{#if uniqueAreas(prompt.available_slots)}<span>{uniqueAreas(prompt.available_slots)}</span>{/if}
						{#if slotDates(prompt.available_slots)}<span>{slotDates(prompt.available_slots)}</span>{/if}
					</div>
					{#if prompt.body_snippet}
						<p class="map-card-snippet">{prompt.body_snippet}</p>
					{/if}
				</div>
			</a>
		</div>
	{/if}
{:else}
<div class="content">
			{#if data.prompts.length === 0}
				<div class="empty-state">
					<p>{copy.discover.noConversations}</p>
					<p class="empty-hint">{copy.discover.checkBackSoon}</p>
					<a href="/conversations/new" class="btn-primary btn-primary--sm" style="margin-top: var(--space-4); display: inline-block; text-decoration: none;">{copy.discover.startConversation}</a>
				</div>
			{:else if filteredPrompts.length === 0}
					<div class="empty-state">
						<p>{copy.discover.noMatchingFilters}</p>
						<button class="clear-filters-link" onclick={clearFilters}>{copy.common.clearFilters}</button>
					</div>
				{:else}
					<div class="prompt-list">
						{#each filteredPrompts as prompt}
							<ConversationCard
								title={prompt.title ?? 'Untitled'}
								coverUrl={prompt.cover_image_url}
								snippet={prompt.body_snippet}
								metaLeft={slotDates(prompt.available_slots)}
								metaRight={uniqueAreas(prompt.available_slots)}
								href={`/conversations/${prompt.id}`}
								audienceScopeName={prompt.audience_scope_name}
							/>
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
		prompts={data.searchCorpus}
		onClose={() => searchOpen = false}
		onSelect={(id) => { searchOpen = false; goto(`/conversations/${id}`); }}
	/>
{/if}

{#if showOnboarding}
	<OnboardingModal onDone={finishOnboarding} username={data.username} />
{/if}

<style>
	.floating-nav-wrapper { display: block; }
	/* Full-bleed map background; the left nav strip sits on top of it. */
	.map-pane {
		position: fixed;
		inset: 0;
	}

	.map-pane-inner {
		width: 100%;
		height: 100%;
	}

	/* ── Airbnb-style card floating over the map (same as the landing) ── */
	.map-card {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 1100;
		width: min(320px, 84vw);
		background: #fff;
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
		text-align: left;
		animation: map-card-in 0.18s ease;
	}

	@keyframes map-card-in {
		from { opacity: 0; transform: translate(-50%, -46%) scale(0.97); }
		to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
	}

	.map-card-close {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 2;
		width: 30px;
		height: 30px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.95);
		color: #222;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
	.map-card-close:hover { background: #fff; }

	.map-card-link { text-decoration: none; color: inherit; display: block; }

	.map-card-cover { width: 100%; aspect-ratio: 3 / 2; overflow: hidden; }
	.map-card-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }

	.map-card-body { padding: var(--space-4); }

	.map-card-title {
		font-size: var(--text-md);
		font-weight: 600;
		color: #111;
		margin: 0 0 var(--space-1);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.map-card-meta {
		display: flex;
		gap: var(--space-3);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.03em;
		color: #717171;
		margin-bottom: var(--space-2);
	}

	.map-card-snippet {
		font-size: var(--text-sm);
		color: #555;
		line-height: 1.45;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.content {
		width: 100%;
		max-width: var(--content-wide);
		padding-bottom: var(--nav-clearance);
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

	/* .btn-primary / .btn-primary--sm live in shared.css; see ConversationCard.svelte for list items. */
</style>
