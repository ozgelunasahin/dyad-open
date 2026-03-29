<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { PageData } from './$types';
	import type { PromptSummary } from '$lib/domain/types';
	import RotatingHeadline from '$lib/components/RotatingHeadline.svelte';
	import PromptListItem from '$lib/components/PromptListItem.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import AuthDialog from '$lib/components/AuthDialog.svelte';

	let { data }: { data: PageData } = $props();

	let viewMode = $state<'list' | 'map'>('list');
	let mapCenter = $state<[number, number] | null>(null);
	let mapZoom = $state<number | null>(null);
	let selectedPinPrompts = $state<PromptSummary[]>([]);

	let authDialog = $state<AuthDialog | undefined>();

	function openAuth(mode: 'waitlist' | 'login') {
		authDialog?.show(mode);
	}

	function handlePinSelect(prompts: PromptSummary[], _area: string) {
		selectedPinPrompts = prompts;
	}

	function handleMapMove(center: [number, number], zoom: number) {
		mapCenter = center;
		mapZoom = zoom;
	}
</script>

<svelte:head>
	<title>dyad. cultivating a culture of conversation</title>
	<meta name="description" content="Meet people through conversation in Berlin. Read, pick a time, meet in person." />
</svelte:head>

<div class="landing">
	<!-- Left: fixed hero panel -->
	<div class="left-col">
		<div class="left-top">
			<img src="/images/logo.png" alt="dyad." class="logo" />
			<div class="top-city-row">
				<span class="city-dot" aria-hidden="true"></span>
				<span class="city-name">BERLIN</span>
			</div>
			<span class="beta-label">private beta</span>
		</div>

		<div class="hero-content">
			<RotatingHeadline />

			<p class="tagline">cultivating a culture<br />of conversation</p>

			<div class="city-row">
				<span class="city-dot" aria-hidden="true"></span>
				<span class="city-name">BERLIN</span>
			</div>

			<div class="hero-actions">
				<button class="join-btn" onclick={() => openAuth('waitlist')}>
					join waitlist <span class="arrow" aria-hidden="true">→</span>
				</button>
				<button class="login-btn" onclick={() => openAuth('login')}>
					log in
				</button>
			</div>
		</div>

	</div>

	<!-- Right: discover view (list/map toggle) -->
	<div class="right-col">
		{#if viewMode === 'map'}
			<div class="map-container">
				{#await import('$lib/components/MapView.svelte')}
					<p class="map-loading">Loading map...</p>
				{:then { default: MapView }}
					<MapView
						prompts={data.prompts}
						initialCenter={mapCenter}
						initialZoom={mapZoom}
						onSelectPin={handlePinSelect}
						onMoveEnd={handleMapMove}
					/>
				{:catch}
					<p class="map-loading">Map failed to load.</p>
				{/await}

				{#if selectedPinPrompts.length > 0}
					<div class="bottom-sheet-wrap">
						<BottomSheet prompts={selectedPinPrompts} onCardClick={() => openAuth('waitlist')} hideAuthor />
					</div>
				{/if}
			</div>
		{:else}
			<div class="prompt-list">
				{#if data.prompts && data.prompts.length > 0}
					{#each data.prompts as prompt}
						<PromptListItem {prompt} onclick={() => openAuth('waitlist')} hideAuthor />
					{/each}
				{:else}
					<div class="empty-state">
						<p>Conversations are starting soon.</p>
						<button class="join-btn" onclick={() => openAuth('waitlist')}>
							Join the waitlist <span class="arrow" aria-hidden="true">→</span>
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<FloatingNav
			variant="landing"
			active={viewMode === 'map' ? 'map' : ''}
			onMapClick={() => viewMode = viewMode === 'map' ? 'list' : 'map'}
		/>
	</div>
</div>

<footer class="page-footer" class:hidden={viewMode === 'map'}>
	<button class="theme-toggle" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
		{#if themeStore.current === 'light'}
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
				<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
				<path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		{:else}
			<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
				<path d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</button>
	<div class="legal-links">
		<a href="/datenschutz" class="legal-link">privacy policy</a>
		<span class="legal-sep">|</span>
		<a href="/impressum" class="legal-link">legal notice</a>
	</div>
</footer>

<AuthDialog bind:this={authDialog} />

<style>
	/* ── Split layout ─────────────────────────────────────────── */
	.landing {
		display: grid;
		grid-template-columns: 1fr 1fr;
		height: 100vh;
		overflow: hidden;
		background: var(--bg-canvas);
	}

	/* ── Left column ──────────────────────────────────────────── */
	.left-col {
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding: var(--space-6) var(--space-10) var(--space-6);
		box-sizing: border-box;
		border-right: 1px solid var(--border-link);
		overflow: hidden;
	}

	.left-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	/* City indicator in top bar — hidden on desktop, shown on mobile */
	.top-city-row { display: none; }

	.logo {
		height: 28px;
		width: auto;
		filter: brightness(0) opacity(0.4);
	}
	:global([data-theme='dark']) .logo { filter: none; }

	.beta-label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.hero-content {
		margin-top: auto;
		padding-bottom: var(--space-2);
	}

	.tagline {
		font-size: clamp(0.82rem, 1.1vw, 0.95rem);
		line-height: 1.55;
		margin: 0 0 var(--space-8);
		border-left: 2px solid var(--text-primary);
		padding-left: var(--space-3);
	}

	.city-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.city-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-success);
		flex-shrink: 0;
		animation: pulse 2.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.city-name {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: 0.1em;
		color: var(--text-muted);
	}

	.hero-actions {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.join-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-base);
		color: var(--bg-canvas);
		background: var(--text-primary);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-input);
		padding: var(--space-3) var(--space-5);
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.join-btn:hover { opacity: var(--opacity-hover-btn); }
	.arrow { font-size: var(--text-sm); }

	.login-btn {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--space-2);
	}
	.login-btn:hover { color: var(--text-primary); }

	/* ── Page footer (below grid) ─────────────────────────────── */
	.page-footer {
		position: fixed;
		bottom: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 50%;
		padding: var(--space-3) var(--space-10);
		box-sizing: border-box;
		z-index: 100;
	}

	.page-footer.hidden { display: none; }

	.theme-toggle {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: var(--space-1);
	}
	.theme-toggle:hover { color: var(--text-primary); }

	.legal-links {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.legal-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}
	.legal-link:hover { color: var(--text-primary); }
	.legal-sep { color: var(--text-muted); font-size: var(--text-xs); }

	/* ── Right column ─────────────────────────────────────────── */
	.right-col {
		height: 100vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	/* Override fixed positioning of FloatingNav and BottomSheet to scope to right column */
	.right-col :global(.floating-nav-anchor) {
		position: absolute;
		left: 50%;
	}
	.right-col :global(.sheet) {
		position: absolute;
		left: 50%;
	}

	/* ── Map ──────────────────────────────────────────────────── */
	.map-container {
		flex: 1;
		position: relative;
		min-height: 300px;
	}

	/* Force Leaflet container to fill the map-container via absolute positioning,
	   since height:100% doesn't resolve against flex-computed heights */
	.map-container :global(.map-container) {
		position: absolute;
		inset: 0;
	}

	.bottom-sheet-wrap {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 600;
	}

	/* ── List ─────────────────────────────────────────────────── */
	.prompt-list {
		flex: 1;
		padding: 0 var(--space-4);
	}

	.empty-state {
		padding: var(--space-10);
		text-align: center;
		color: var(--text-muted);
	}

	.empty-state p { margin: 0 0 var(--space-4); }

	.map-loading { text-align: center; color: var(--text-muted); padding: var(--space-10); }

	/* ── Mobile ───────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.landing {
			display: flex;
			flex-direction: column;
			height: auto;
			overflow: auto;
		}

		.left-col {
			height: auto;
			border-right: none;
			border-bottom: 1px solid var(--border-link);
			padding: var(--space-6) var(--space-4) var(--space-6);
		}

		.hero-content { margin-top: var(--space-10); }
		.top-city-row { display: flex; align-items: center; gap: var(--space-2); }
		.city-row { display: none; }

		.right-col {
			height: auto;
			overflow: visible;
			min-height: 50vh;
		}

		.map-container {
			height: min(50vh, 400px);
			min-height: 300px;
		}

		.page-footer {
			position: relative;
			width: 100%;
			padding: var(--space-3) var(--space-4);
		}

		.right-col :global(.floating-nav-anchor) {
			position: fixed;
		}
	}
</style>
