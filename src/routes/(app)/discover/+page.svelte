<script lang="ts">
	import type { PageData } from './$types';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import MapView from '$lib/components/MapView.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
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
	import { capture } from '$lib/analytics';

	let { data }: { data: PageData } = $props();

	const ONBOARDING_KEY = 'dyad_onboarding_done';
	const isWelcome = browser && new URLSearchParams(window.location.search).get('welcome') === '1';
	let showOnboarding = $state(isWelcome && !localStorage.getItem(ONBOARDING_KEY));

	if (isWelcome && !localStorage.getItem(ONBOARDING_KEY)) {
		// Read referral cookie for attribution
		const dyadRef = browser
			? document.cookie.split('; ').find(r => r.startsWith('dyad_ref='))?.split('=')[1]
			: undefined;
		capture('user_signed_up', { referred_by: dyadRef || null });
	}

	function finishOnboarding() {
		if (browser) localStorage.setItem(ONBOARDING_KEY, '1');
		showOnboarding = false;
		// Clean up the ?welcome=1 param from the URL without a page reload
		const url = new URL(window.location.href);
		url.searchParams.delete('welcome');
		window.history.replaceState({}, '', url);
	}
	let viewMode = $state<'grid' | 'map'>('map');
	let mapCenter = $state<[number, number] | null>([52.52, 13.405]);
	let mapZoom = $state<number | null>(12);

	export const snapshot: Snapshot<{ center: [number, number] | null; zoom: number | null }> = {
		capture: () => ({ center: mapCenter, zoom: mapZoom }),
		restore: (value: { center: [number, number] | null; zoom: number | null }) => { mapCenter = value.center; mapZoom = value.zoom; }
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
			onCardClick={(prompt) => goto(`/conversations/${prompt.id}`)}
			onMapClick={closeSheet}
			initialCenter={mapCenter}
			initialZoom={mapZoom}
			onMoveEnd={(c, z) => { mapCenter = c; mapZoom = z; }}
		/>
		{#if selectedPinPrompts.length > 0}
			<div class="map-sheet-wrap">
				<BottomSheet
					prompts={selectedPinPrompts}
					onClose={closeSheet}
					onCardClick={(id) => goto(`/conversations/${id}`)}
					navClearance={true}
				/>
			</div>
		{/if}
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
					/>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<div class="floating-nav-wrapper">
	<FloatingNav
		variant="discover"
		active={viewMode === 'map' ? 'map' : 'grid'}
		attentionCount={data.attentionCount ?? 0}
		onMapClick={() => viewMode = viewMode === 'map' ? 'grid' : 'map'}
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

	/* ── Map view ── */
	.map-pane {
		position: absolute;
		inset: 0;
	}

	.map-sheet-wrap {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 600;
	}

	/* ── DFOS grid view ── */
	.discover-grid-pane {
		min-height: 100vh;
		padding: 32px 32px 120px;
	}

	.discover-grid-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.discover-kicker {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.new-convo-link {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.new-convo-link:hover { color: var(--text-primary); }

	/* ── DFOS card grid ── */
	.dfos-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}

	.dfos-card {
		position: relative;
		border-radius: 16px;
		overflow: hidden;
		text-decoration: none;
		display: block;
		background: #111;
		aspect-ratio: 4 / 3;
		cursor: pointer;
	}

	/* Cover image */
	.dfos-cover {
		position: absolute;
		inset: 0;
		transition: transform 0.4s ease;
	}
	.dfos-card:hover .dfos-cover { transform: scale(1.03); }

	.dfos-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.dfos-cover-placeholder {
		width: 100%;
		height: 100%;
		background: #1a1a1a;
	}

	/* Arrow top-right, appears on hover */
	.dfos-arrow {
		position: absolute;
		top: 14px;
		right: 14px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(255,255,255,0.12);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: #fff;
		opacity: 0;
		transform: scale(0.8);
		transition: opacity 0.2s ease, transform 0.2s ease;
		z-index: 2;
	}
	.dfos-card:hover .dfos-arrow {
		opacity: 1;
		transform: scale(1);
	}

	/* Bottom overlay */
	.dfos-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 48px 16px 16px;
		background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.dfos-info {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	/* Small community icon — first letter */
	.dfos-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: rgba(255,255,255,0.15);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: #fff;
		flex-shrink: 0;
		border: 1px solid rgba(255,255,255,0.15);
	}

	.dfos-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.dfos-title {
		font-size: 15px;
		font-weight: 600;
		color: #fff;
		line-height: 1.25;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.dfos-area {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(255,255,255,0.55);
	}

	/* Description: hidden by default, slides up on hover */
	.dfos-description {
		margin: 0;
		font-size: 12px;
		line-height: 1.5;
		color: rgba(255,255,255,0.75);
		max-height: 0;
		overflow: hidden;
		opacity: 0;
		transform: translateY(6px);
		transition: max-height 0.3s ease, opacity 0.25s ease, transform 0.25s ease;
		padding-top: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.dfos-card:hover .dfos-description {
		max-height: 60px;
		opacity: 1;
		transform: translateY(0);
		padding-top: 8px;
	}

	/* ── Empty / util ── */
	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--text-muted);
	}
	.empty-state p { margin: 0.5rem 0; }

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

	@media (max-width: 700px) {
		.dfos-grid { grid-template-columns: 1fr; }
		.discover-grid-pane { padding: 20px 16px 100px; }
	}
</style>
