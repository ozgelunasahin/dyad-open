<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { PageData } from './$types';
	import type { PromptSummary } from '$lib/domain/types';
	import RotatingHeadline from '$lib/components/RotatingHeadline.svelte';
	import PromptListItem from '$lib/components/PromptListItem.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import AuthDialog from '$lib/components/AuthDialog.svelte';

	let { data }: { data: PageData } = $props();

	let mapCenter = $state<[number, number] | null>(null);
	let mapZoom = $state<number | null>(null);
	let selectedPinPrompts = $state<PromptSummary[]>([]);
	let fullscreenPinPrompts = $state<PromptSummary[]>([]);
	let scrolledPastHero = $state(false);
	let mapFullscreen = $state(false);

	let authDialog = $state<AuthDialog | undefined>();

	onMount(() => {
		function handleScroll() {
			scrolledPastHero = window.scrollY > window.innerHeight * 0.5;
		}
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function openAuth(mode: 'waitlist' | 'login') {
		authDialog?.show(mode);
	}

	function handlePinSelect(prompts: PromptSummary[], _area: string) {
		if (window.innerWidth <= 768) {
			// Mobile: go fullscreen directly, skip hero-map sheet
			mapFullscreen = true;
			setTimeout(() => { fullscreenPinPrompts = prompts; }, 320);
		} else {
			selectedPinPrompts = prompts;
		}
	}

	function handleMapMove(center: [number, number], zoom: number) {
		mapCenter = center;
		mapZoom = zoom;
	}
</script>

<svelte:head>
	<title>dyad.</title>
	<meta name="description" content="Find your people, talk to them face to face." />
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

		<!-- Map preview — fills empty space on mobile, hidden on desktop -->
		<div class="hero-map">
			{#await import('$lib/components/MapView.svelte')}
				<div class="hero-map-placeholder"></div>
			{:then { default: HeroMap }}
				<HeroMap
					prompts={data.prompts}
					initialCenter={mapCenter}
					initialZoom={mapZoom ?? 12}
					onSelectPin={handlePinSelect}
					onMoveEnd={handleMapMove}
					scrollWheelZoom={false}
					onMapClick={() => selectedPinPrompts = []}
				/>
			{:catch}
				<div class="hero-map-placeholder"></div>
			{/await}
			<button
				class="hero-map-expand"
				onclick={() => mapFullscreen = true}
				aria-label="Full screen map"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			{#if selectedPinPrompts.length > 0}
				<div class="hero-sheet-wrap">
					<BottomSheet prompts={selectedPinPrompts} onClose={() => selectedPinPrompts = []} onCardClick={() => openAuth('waitlist')} hideAuthor navClearance={false} />
				</div>
			{/if}
		</div>

		<div class="hero-content">
			<RotatingHeadline />

			<p class="tagline">A place on the web to find people to talk to,<span class="tagline-break"> </span> face to face.</p>

			<a href="/why" class="why-link">Why does Dyad exist?</a>

			<div class="city-row">
				<span class="city-dot" aria-hidden="true"></span>
				<span class="city-name">BERLIN</span>
			</div>

			<div class="hero-actions">
				<button class="join-btn" onclick={() => openAuth('waitlist')}>
					join waitlist
				</button>
				<button class="login-btn" onclick={() => openAuth('login')}>
					log in
				</button>
				<button class="theme-toggle theme-toggle-inline" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
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
			</div>
		</div>

		<footer class="page-footer"></footer>
	</div>

	<!-- Right: map on desktop, list on mobile -->
	<div class="right-col">
		<div class="right-map">
			{#await import('$lib/components/MapView.svelte')}
				<div class="hero-map-placeholder"></div>
			{:then { default: RightMap }}
				<RightMap
					prompts={data.prompts}
					initialCenter={mapCenter}
					initialZoom={mapZoom ?? 12}
					onSelectPin={handlePinSelect}
					onMoveEnd={handleMapMove}
					scrollWheelZoom={true}
					onMapClick={() => selectedPinPrompts = []}
				/>
			{:catch}
				<div class="hero-map-placeholder"></div>
			{/await}
			{#if selectedPinPrompts.length > 0}
				<div class="right-sheet-wrap">
					<BottomSheet prompts={selectedPinPrompts} onClose={() => selectedPinPrompts = []} onCardClick={() => openAuth('waitlist')} hideAuthor navClearance={false} />
				</div>
			{/if}
		</div>
		<div class="prompt-list">
			{#if data.prompts && data.prompts.length > 0}
				{#each data.prompts as prompt}
					<PromptListItem {prompt} onclick={() => openAuth('waitlist')} hideAuthor />
				{/each}
			{:else}
				<div class="empty-state">
					<p>Conversations are starting soon.</p>
					<button class="join-btn" onclick={() => openAuth('waitlist')}>
						Join the waitlist
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Full-screen map overlay -->
{#if mapFullscreen}
	<div class="map-overlay" transition:fade={{ duration: 380 }}>
		{#await import('$lib/components/MapView.svelte')}
			<p class="map-loading">Loading map...</p>
		{:then { default: FullMap }}
			<FullMap
				prompts={data.prompts}
				initialCenter={mapCenter}
				initialZoom={mapZoom}
				onSelectPin={(prompts) => fullscreenPinPrompts = prompts}
				onMoveEnd={handleMapMove}
				onMapClick={() => fullscreenPinPrompts = []}
			/>
		{/await}
		{#if fullscreenPinPrompts.length > 0}
			<div class="overlay-sheet-wrap">
				<BottomSheet prompts={fullscreenPinPrompts} onClose={() => fullscreenPinPrompts = []} onCardClick={() => openAuth('waitlist')} hideAuthor navClearance={false} />
			</div>
		{/if}
		<button class="map-overlay-close" onclick={() => { mapFullscreen = false; fullscreenPinPrompts = []; selectedPinPrompts = []; }} aria-label="Close map">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>
	</div>
{/if}

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
		position: relative;
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
		padding-bottom: var(--space-6);
	}

	.tagline {
		font-size: clamp(0.82rem, 1.1vw, 0.95rem);
		line-height: 1.55;
		margin: 0 0 var(--space-5);
	}

	.tagline-break {
		display: inline;
	}

	.why-link {
		display: block;
		font-size: clamp(0.78rem, 1vw, 0.88rem);
		font-style: italic;
		color: var(--text-muted);
		opacity: 0.6;
		text-decoration: none;
		margin: 0 0 var(--space-5);
	}
	.why-link:hover { opacity: 1; }

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

	/* ── Page footer (inside left-col) ───────────────────────── */
	.page-footer {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-10);
		box-sizing: border-box;
	}

	.theme-toggle {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: var(--space-1);
	}
	.theme-toggle:hover { color: var(--text-primary); }
	.theme-toggle-inline { display: flex; margin-left: auto; }

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

	/* ── Hero map (mobile only) ──────────────────────────────── */
	.hero-map { display: none; }

	/* ── Right column ─────────────────────────────────────────── */
	.right-col {
		height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
		transform: translateZ(0); /* contain position:fixed children */
	}

	.right-map {
		position: absolute;
		inset: 0;
	}

	.right-map :global(.map-container) {
		position: absolute;
		inset: 0;
	}

	.right-col .prompt-list {
		display: none;
	}

	/* ── Right-col sheet wrap (contains fixed BottomSheet inside right-col) */
	.right-sheet-wrap {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 600;
	}

	/* ── Full-screen map overlay ─────────────────────────────── */
	.map-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: var(--bg-canvas);
	}

	.map-overlay :global(.map-container) {
		position: absolute;
		inset: 0;
	}

	.map-overlay-close {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		z-index: 1010;
		background: var(--bg-glass);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-primary);
		cursor: pointer;
	}

	.overlay-sheet-wrap {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1005;
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
			height: 100vh;
			overflow: hidden;
		}

		.left-col {
			height: 100vh;
			min-height: unset;
			border-right: none;
			border-bottom: none;
			padding: var(--space-6) var(--space-4) calc(var(--space-10) + var(--space-6));
			transform: translateZ(0); /* contain position:fixed BottomSheet within 100vh */
		}

		.hero-content { margin-top: auto; }
		.top-city-row { display: none; }

		.hero-map {
			display: block;
			height: 45vh;
			flex-shrink: 0;
			margin: var(--space-4) 0;
			border-radius: var(--radius-card);
			overflow: hidden;
			position: relative;
		}

		.hero-map :global(.map-container) {
			position: absolute;
			inset: 0;
		}

		.hero-map-expand {
			position: absolute;
			bottom: var(--space-3);
			left: var(--space-3);
			z-index: 500;
			background: var(--bg-glass);
			backdrop-filter: blur(8px);
			-webkit-backdrop-filter: blur(8px);
			border: none;
			border-radius: var(--radius-card);
			padding: var(--space-2);
			color: var(--text-primary);
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.hero-map-placeholder {
			width: 100%;
			height: 100%;
			background: var(--bg-control);
		}

		.hero-sheet-wrap {
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			z-index: 600;
		}

		/* Sheet fills from viewport bottom up to map */
		.hero-sheet-wrap :global(.sheet) {
			max-height: calc(100vh - 45vh - 96px);
			border-radius: var(--radius-card) var(--radius-card) 0 0;
		}

		.tagline-break {
			display: block;
		}

		.hero-actions { padding-bottom: 0; }

		.page-footer { display: none; }
		.theme-toggle-inline { display: flex; }

		.right-col {
			display: none;
		}

		.right-col .prompt-list {
			display: block;
			overflow-y: auto;
		}
	}
</style>
