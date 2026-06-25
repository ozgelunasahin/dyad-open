<script lang="ts">
	import type { PageData } from './$types';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import MapView from '$lib/components/MapView.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import ConversationCard from '$lib/components/ConversationCard.svelte';
	import ExploreCommunities from '$lib/components/ExploreCommunities.svelte';

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
	// Set once the DB write (profiles.onboarded) has been confirmed, so we don't
	// re-POST on every visit and we know whether a retry is still owed.
	const ONBOARDING_SYNCED_KEY = 'dyad_onboarding_synced';
	const isWelcome = browser && new URLSearchParams(window.location.search).get('welcome') === '1';
	// Guests (corner-exclusive members) skip the commons onboarding — its
	// framing is written for the Berlin commons, not a conference corner.
	let showOnboarding = $state(isWelcome && !data.isGuest && !localStorage.getItem(ONBOARDING_KEY));

	// Persist onboarding completion to the DB (profiles.onboarded = true) — the
	// durable signal downstream consumers key off. Not fire-and-forget: a dropped
	// request would leave the member un-onboarded forever, so success sets a synced
	// flag and any failure is retried on the next discover visit (see onMount).
	async function persistOnboarding() {
		if (!browser) return;
		try {
			const res = await fetch('/api/onboarding/complete', { method: 'POST' });
			if (res.ok) {
				localStorage.setItem(ONBOARDING_SYNCED_KEY, '1');
			} else {
				console.error('[onboarding] persist failed:', res.status);
			}
		} catch (err) {
			console.error('[onboarding] persist request failed:', err);
		}
	}

	onMount(() => {
		// Self-heal a previously dropped persistence call: the member finished
		// onboarding (UI flag set) but the DB write was never confirmed.
		if (
			!data.isGuest &&
			localStorage.getItem(ONBOARDING_KEY) &&
			!localStorage.getItem(ONBOARDING_SYNCED_KEY)
		) {
			void persistOnboarding();
		}
	});

	function finishOnboarding() {
		if (browser) localStorage.setItem(ONBOARDING_KEY, '1');
		showOnboarding = false;
		void persistOnboarding();
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
	let exploreOpen = $state(false);

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
		<button class="communities-pill" onclick={() => (exploreOpen = true)}>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<circle cx="5" cy="6" r="2.2" stroke="currentColor" stroke-width="1.3"/>
				<circle cx="11" cy="6" r="2.2" stroke="currentColor" stroke-width="1.3"/>
				<path d="M2 13c0-1.7 1.3-3 3-3s3 1.3 3 3M8 13c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
			</svg>
			<span>Communities</span>
		</button>
		<MapView
			prompts={filteredPrompts}
			slotFilter={mapSlotFilter}
			anchoredPopup={true}
			locateOnLoad={true}
			onSelectPin={() => {}}
			initialCenter={mapCenter ?? data.mapCenter}
			initialZoom={mapZoom}
			onMoveEnd={(c, z) => { mapCenter = c; mapZoom = z; }}
		/>
	</div>
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

<ExploreCommunities bind:open={exploreOpen} />

{#if showOnboarding}
	<OnboardingModal onDone={finishOnboarding} username={data.username} />
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

	/* Entry point to the community discovery channel, floating over the map. */
	.communities-pill {
		position: absolute;
		top: var(--space-4);
		left: 50%;
		transform: translateX(-50%);
		z-index: 600;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border: none;
		border-radius: var(--radius-pill);
		background: var(--bg-glass);
		backdrop-filter: blur(8px);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.14);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.communities-pill:hover { opacity: var(--opacity-hover-btn); }

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
