<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import ConstellationCanvas from '$lib/components/ConstellationCanvas.svelte';
	import MobileOrbit from '$lib/components/MobileOrbit.svelte';
	import AuthDialog from '$lib/components/AuthDialog.svelte';

	let { data }: { data: PageData } = $props();

	let authDialog = $state<AuthDialog | undefined>();
	let isMobile = $state(false);
	let resourcesOpen = $state(false);

	function openAuth(mode: 'waitlist' | 'login') {
		authDialog?.show(mode);
	}

	onMount(() => {
		const mq = window.matchMedia('(max-width: 640px)');
		isMobile = mq.matches;
		const handler = (e: MediaQueryListEvent) => { isMobile = e.matches; };
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

<svelte:head>
	<title>dyad.</title>
	<meta name="description" content="The offline social network owned by its community." />
</svelte:head>

{#if isMobile}
	<!-- ── Mobile: orbiting card carousel ── -->
	<MobileOrbit cards={data.cards} onWaitlist={() => openAuth('waitlist')} />
{:else}
	<!-- ── Desktop: 3D constellation ── -->
	<ConstellationCanvas cards={data.cards} bare={true} />

	<!-- ── Hero (bottom-left) ── -->
	<div class="hero">
		<p class="tagline">the offline social network<br />owned by its community</p>
		<div class="hero-links">
			<button class="hero-cta" onclick={() => openAuth('waitlist')}>join</button>
			<a href="/field-notes" class="hero-cta">explore</a>
		</div>
	</div>

	<!-- ── Footer bar (desktop, fixed at bottom edge) ── -->
	<footer class="site-footer">
		<div class="footer-resources-wrap">
			<button
				class="footer-link footer-resources-btn"
				onclick={() => resourcesOpen = !resourcesOpen}
				aria-expanded={resourcesOpen}
			>
				resources
				<svg class="resources-chevron" class:resources-chevron--open={resourcesOpen} width="8" height="8" viewBox="0 0 8 8" fill="none">
					<path d="M1 5.5L4 2.5L7 5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>

			{#if resourcesOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<div class="resources-backdrop" onclick={() => resourcesOpen = false}></div>
				<nav class="resources-panel" aria-label="Resources">
					<a href="/help" class="resources-item">Help center</a>
					<a href="/roadmap" class="resources-item">Platform roadmap</a>
					<a href="/coop-roadmap" class="resources-item">Co-op roadmap</a>
					<a href="/coop-docs" class="resources-item">Co-op docs</a>
					<a href="/changelog" class="resources-item">Changelog</a>
				</nav>
			{/if}
		</div>

		<span class="footer-sep">·</span>
		<a href="/steward-ownership" class="footer-link">steward ownership</a>
		<span class="footer-sep">·</span>
		<a href="/governance" class="footer-link">participatory governance</a>
		<span class="footer-sep">·</span>
		<a href="/community-care" class="footer-link">community care</a>
		<span class="footer-sep">·</span>
		<span class="footer-text">currently in beta in berlin</span>
	</footer>

	<!-- ── Legal bar (below footer) ── -->
	<div class="legal-bar">
		<a href="/impressum" class="legal-link">terms of use</a>
		<span class="legal-sep">·</span>
		<a href="/datenschutz" class="legal-link">privacy policy</a>
	</div>
{/if}

<!-- ── Header (always visible) ── -->
<header class="hdr">
	<a href="/" class="wordmark" aria-label="DYAD">DYAD</a>
	<nav class="hdr-nav">
		<button class="nav-link" onclick={() => openAuth('login')}>log in</button>
		<button class="btn-join" onclick={() => openAuth('waitlist')}>join</button>
	</nav>
</header>

<AuthDialog bind:this={authDialog} />

<style>
	:global(body) { margin: 0; }
	/* Desktop only — mobile orbit needs natural scroll + tap events */
	@media (min-width: 641px) {
		:global(body) { overflow: hidden; }
	}

	/* ── Header ── */
	.hdr {
		position: fixed;
		top: 0; left: 0; right: 0;
		z-index: 500;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 22px 36px;
		background: linear-gradient(to bottom, rgba(4, 4, 7, 0.72) 0%, transparent 100%);
	}

	.wordmark {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 22px;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		line-height: 1;
	}

	.hdr-nav {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.nav-link {
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
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
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
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

	/* ── Hero ── */
	.hero {
		position: fixed;
		bottom: 68px;
		left: 40px;
		z-index: 500;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.tagline {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: clamp(0.85rem, 1.6vw, 1.15rem);
		font-weight: 500;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
		letter-spacing: -0.02em;
	}

	.hero-links {
		display: flex;
		gap: 28px;
		align-items: baseline;
	}

	.hero-cta {
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.75rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.45);
		padding: 0;
		text-decoration: none;
		transition: color 0.15s;
		letter-spacing: 0.04em;
	}
	.hero-cta:hover { color: rgba(255, 255, 255, 0.95); }
	.hero-cta:first-child { color: rgba(255, 255, 255, 0.85); }
	.hero-cta:first-child:hover { color: #fff; }

	/* ── Footer bar (desktop) ── */
	.site-footer {
		position: fixed;
		bottom: 18px;
		left: 0;
		right: 0;
		z-index: 400;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 0 40px;
		height: 20px;
	}

	.footer-link,
	.footer-text {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.62rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.22);
		text-decoration: none;
		white-space: nowrap;
		transition: color 0.15s;
	}

	.footer-link:hover { color: rgba(255, 255, 255, 0.6); }

	.footer-sep {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.62rem;
		color: rgba(255, 255, 255, 0.1);
		padding: 0 10px;
	}

	/* ── Resources trigger ── */
	.footer-resources-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.footer-resources-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.resources-chevron {
		color: rgba(255, 255, 255, 0.18);
		transition: transform 0.18s ease, color 0.15s;
	}
	.resources-chevron--open {
		transform: rotate(180deg);
		color: rgba(255, 255, 255, 0.45);
	}

	.resources-backdrop {
		position: fixed;
		inset: 0;
		z-index: 390;
	}

	.resources-panel {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 410;
		background: rgba(12, 12, 16, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 1px;
		backdrop-filter: blur(16px);
		min-width: 160px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.resources-item {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.04em;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
		padding: 7px 12px;
		border-radius: 6px;
		white-space: nowrap;
		transition: background 0.12s, color 0.12s;
	}
	.resources-item:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.85);
	}

	/* ── Legal bar ── */
	.legal-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 400;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 0 40px;
		height: 18px;
		background: linear-gradient(to top, rgba(4, 4, 7, 0.7) 0%, transparent 100%);
	}

	.legal-link {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.52rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.12);
		text-decoration: none;
		transition: color 0.15s;
	}
	.legal-link:hover { color: rgba(255, 255, 255, 0.4); }

	.legal-sep {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.52rem;
		color: rgba(255, 255, 255, 0.07);
		padding: 0 8px;
	}
</style>
