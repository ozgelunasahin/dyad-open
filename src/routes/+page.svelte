<script lang="ts">
	import type { PageData } from './$types';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import AuthDialog from '$lib/components/AuthDialog.svelte';
	import { copy } from '$lib/copy';

	const og = copy.landing;
	const ogImage = `${og.ogUrl}/images/og-card.png`;

	let { data }: { data: PageData } = $props();

	let authDialog = $state<AuthDialog | undefined>();
	// The conversation opened on the left (Airbnb-style detail pane). Null = grid.
	let selected = $state<PromptSummary | null>(null);

	const conversations = $derived<PromptSummary[]>(data.mapPrompts ?? []);

	function openAuth(mode: 'waitlist' | 'login') {
		authDialog?.show(mode);
	}

	function closeConversation() {
		selected = null;
	}

	// Clicking a map pin opens the nearest conversation as a floating card.
	function handlePinSelect(items: Array<{ prompt: PromptSummary; slots: TimeSlot[] }>) {
		if (items.length > 0) selected = items[0].prompt;
	}

	function formatDate(iso?: string | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function areaOf(prompt: PromptSummary): string {
		return prompt.available_slots[0]?.general_area ?? '';
	}
</script>

<svelte:head>
	<title>{og.title}</title>
	<meta name="description" content={og.metaDescription} />

	<!-- Open Graph (Facebook, LinkedIn, Slack, iMessage, Discord, Signal, …) -->
	<meta property="og:title" content={og.title} />
	<meta property="og:description" content={og.metaDescription} />
	<meta property="og:url" content={og.ogUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={og.ogSiteName} />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={og.title} />
	<meta name="twitter:description" content={og.metaDescription} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<!-- ── Two-pane shell: conversations on the left, map on the right (Airbnb model) ── -->
<div class="shell">
	<!-- LEFT: intro + footer -->
	<section class="left">
			<header class="left-head">
				<h1 class="left-title">collectively owned<br />offline social network</h1>
				<p class="left-sub">A place online to find conversations, people and communities offline. Open source. Steward-owned. Governed by the communities who use it.</p>
				<div class="left-links">
					<button class="text-link text-link--strong" onclick={() => openAuth('waitlist')}>join</button>
					<a href="/steward-ownership" class="text-link">explore</a>
				</div>
			</header>

			<!-- ── Footer (in the left scroll flow) ── -->
			<footer class="site-footer">
				<a href="/steward-ownership" class="footer-link">steward ownership</a>
				<span class="footer-sep">·</span>
				<a href="/governance" class="footer-link">participatory governance</a>
				<span class="footer-sep">·</span>
				<a href="/community-care" class="footer-link">trust, safety &amp; community care</a>
				<span class="footer-sep">·</span>
				<a href="/impressum" class="footer-link">terms</a>
				<span class="footer-sep">·</span>
				<a href="/datenschutz" class="footer-link">privacy</a>
			</footer>
	</section>

	<!-- RIGHT: map nested in a soft-edged black container -->
	<aside class="right">
		<div class="map-frame">
			<div class="map-inner">
				{#await import('$lib/components/MapView.svelte')}
					<div class="map-placeholder"></div>
				{:then { default: MapView }}
					<MapView
						prompts={conversations}
						initialCenter={data.mapCenter}
						initialZoom={12}
						onSelectPin={handlePinSelect}
						onMapClick={closeConversation}
						scrollWheelZoom={true}
						zoomControl={false}
					/>
				{:catch}
					<div class="map-placeholder"></div>
				{/await}
			</div>

			{#if selected}
				<!-- Airbnb-style card floating on top of the map -->
				<div class="map-card">
					<button class="map-card-close" onclick={closeConversation} aria-label="Close">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					</button>
					{#if selected.cover_image_url}
						<div class="map-card-cover">
							<img src={selected.cover_image_url} alt={selected.title ? `Cover image for ${selected.title}` : ''} />
						</div>
					{/if}
					<div class="map-card-body">
						<h3 class="map-card-title">{selected.title ?? 'Untitled'}</h3>
						<div class="map-card-meta">
							{#if areaOf(selected)}<span>{areaOf(selected)}</span>{/if}
							{#if selected.soonest_slot}<span>{formatDate(selected.soonest_slot)}</span>{/if}
						</div>
						{#if selected.body_snippet}
							<p class="map-card-snippet">{selected.body_snippet}</p>
						{/if}
						<button class="map-card-cta" onclick={() => openAuth('waitlist')}>join to read &amp; meet</button>
					</div>
				</div>
			{/if}
		</div>
	</aside>
</div>

<!-- ── Header (always visible) ── -->
<header class="hdr">
	<a href="/" class="wordmark" aria-label="DYAD">DYAD</a>
	<nav class="hdr-nav">
		<a href="/login" class="nav-link" onclick={(e) => { e.preventDefault(); openAuth('login'); }}>log in</a>
		<button class="btn-join" onclick={() => openAuth('waitlist')}>join</button>
	</nav>
</header>

<AuthDialog bind:this={authDialog} />

<style>
	:global(body) { margin: 0; overflow: hidden; }

	/* ── Shell: left content | right map ── */
	/* Uniform outer margin on all sides + a gap between the two panes; the top
	   padding clears the fixed header so the map floats below it. */
	.shell {
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		grid-template-rows: 1fr;
		gap: var(--space-6);
		background: #040407;
		padding: 72px var(--space-6) var(--space-6);
		box-sizing: border-box;
	}

	/* LEFT — content column: intro sits bottom-left, footer pinned to the bottom */
	.left {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-2) 0;
		box-sizing: border-box;
	}

	/* Push the intro (and the footer beneath it) to the bottom of the column. */
	.left-head { margin-top: auto; margin-bottom: var(--space-6); }

	/* dice-style hierarchy: a large, heavy headline that dominates the column. */
	.left-title {
		font-family: var(--font-serif);
		font-size: clamp(2rem, 4.4vw, 3rem);
		font-weight: 700;
		color: rgba(255, 255, 255, 0.97);
		margin: 0 0 var(--space-5);
		line-height: 1.05;
		letter-spacing: -0.015em;
	}

	/* Secondary supporting line — clearly below the headline in the hierarchy. */
	.left-sub {
		font-family: var(--font-mono);
		font-size: 0.82rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.55);
		max-width: 30rem;
		margin: 0 0 var(--space-5);
		letter-spacing: -0.005em;
	}

	.left-links { display: flex; gap: var(--space-5); align-items: baseline; }

	.text-link {
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.5);
		padding: 0;
		text-decoration: none;
		letter-spacing: 0.04em;
		transition: color 0.15s;
	}
	.text-link:hover { color: rgba(255, 255, 255, 0.95); }
	.text-link--strong { color: rgba(255, 255, 255, 0.85); }

	/* RIGHT — map nested in a soft-edged black container */
	.right { min-height: 0; box-sizing: border-box; }

	.map-frame {
		position: relative;
		width: 100%;
		height: 100%;
		background: #0a0a0d;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-card);
		padding: var(--space-3);
		box-sizing: border-box;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
	}

	/* ── Airbnb-style card floating over the map ── */
	.map-card {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 1100;
		width: min(320px, 80%);
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

	.map-card-cover {
		width: 100%;
		aspect-ratio: 3 / 2;
		overflow: hidden;
	}
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
		margin: 0 0 var(--space-3);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.map-card-cta {
		width: 100%;
		background: #111;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 0.74rem;
		letter-spacing: 0.05em;
		color: #fff;
		padding: 10px 16px;
		border-radius: 100px;
		transition: background 0.15s;
	}
	.map-card-cta:hover { background: #000; }

	.map-inner {
		width: 100%;
		height: 100%;
		overflow: hidden;
		border-radius: calc(var(--radius-card) - 6px);
	}

	/* Shown while the map chunk loads, or if it fails to load. */
	.map-placeholder {
		width: 100%;
		height: 100%;
		background: #0a0a0d;
	}

	/* ── Footer (left column flow) ── */
	.site-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0;
		margin-top: var(--space-5);
		padding-top: var(--space-4);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.footer-link {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.25);
		text-decoration: none;
		white-space: nowrap;
		transition: color 0.15s;
	}
	.footer-link:hover { color: rgba(255, 255, 255, 0.6); }

	.footer-sep {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.12);
		padding: 0 10px;
	}

	/* ── Header ── */
	.hdr {
		position: fixed;
		top: 0; left: 0; right: 0;
		z-index: 500;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 18px 28px;
		background: linear-gradient(to bottom, rgba(4, 4, 7, 0.92) 0%, rgba(4, 4, 7, 0.6) 60%, transparent 100%);
	}

	.wordmark {
		font-family: var(--font-serif);
		font-size: 22px;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		line-height: 1;
	}

	.hdr-nav { display: flex; align-items: center; gap: 2px; }

	.nav-link {
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.45);
		padding: 6px 12px;
		border-radius: 6px;
		text-decoration: none;
		transition: color 0.15s;
	}
	.nav-link:hover { color: rgba(255, 255, 255, 0.85); }

	.btn-join {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.18);
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.75);
		padding: 7px 18px;
		border-radius: 100px;
		backdrop-filter: blur(8px);
		transition: background 0.15s, color 0.15s;
		margin-left: 6px;
	}
	.btn-join:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }

	/* ── Mobile: stack intro above the map ── */
	/* Mobile: map on top, copy below; page scrolls. */
	@media (max-width: 768px) {
		:global(body) { overflow: auto; }
		.shell {
			position: relative;
			inset: auto;
			min-height: 100vh;
			grid-template-columns: 1fr;
			grid-template-rows: auto auto;
			gap: var(--space-6);
			padding: 64px var(--space-5) var(--space-6);
		}
		.right { order: -1; height: 56vh; padding: 0; }
		.left { order: 0; overflow: visible; padding: 0; }
		/* On mobile the copy reads top-down under the map (no bottom-pinning). */
		.left-head { margin-top: 0; }
	}
</style>
