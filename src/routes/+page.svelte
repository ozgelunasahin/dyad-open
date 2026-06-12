<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import ConstellationCanvas from '$lib/components/ConstellationCanvas.svelte';
	import MobileOrbit from '$lib/components/MobileOrbit.svelte';
	import AuthDialog from '$lib/components/AuthDialog.svelte';

	let { data }: { data: PageData } = $props();

	let authDialog = $state<AuthDialog | undefined>();
	let isMobile = $state(false);

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
			<a href="/newsletter" class="hero-cta">explore</a>
		</div>
	</div>

	<!-- ── Footer bar (desktop, fixed at bottom edge) ── -->
	<footer class="site-footer">
		<a href="/newsletter" class="footer-link">field notes</a>
		<span class="footer-sep">·</span>
		<a href="/why" class="footer-link">steward ownership</a>
		<span class="footer-sep">·</span>
		<a href="/why" class="footer-link">participatory governance</a>
		<span class="footer-sep">·</span>
		<span class="footer-text">community care</span>
		<span class="footer-sep">·</span>
		<span class="footer-text">currently in beta in berlin</span>
	</footer>
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
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 400;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 0 40px;
		height: 38px;
		background: linear-gradient(to top, rgba(4, 4, 7, 0.85) 0%, transparent 100%);
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
</style>
