<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { PageData } from './$types';
	import AuthDialog from '$lib/components/AuthDialog.svelte';

	let { data }: { data: PageData } = $props();
	let authDialog = $state<AuthDialog | undefined>();

	function openAuth(mode: 'waitlist' | 'login') {
		authDialog?.show(mode);
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	// Community-care, multigenerational topics
	const topics = [
		{ topic: 'grief and gratitude',             city: 'Berlin' },
		{ topic: 'what we owe each other',          city: 'Berlin' },
		{ topic: 'care across generations',         city: 'Berlin' },
		{ topic: 'how to stay when it\'s hard',     city: 'Berlin' },
		{ topic: 'what a neighbourhood could be',   city: 'Berlin' },
		{ topic: 'building across difference',      city: 'Berlin' },
		{ topic: 'collective memory',               city: 'Berlin' },
		{ topic: 'solidarity in practice',          city: 'Berlin' },
	];

	let topicIndex = $state(0);
	let animating = $state(false);

	import { onMount } from 'svelte';

	function goTo(i: number) {
		if (animating) return;
		animating = true;
		setTimeout(() => {
			topicIndex = (i + topics.length) % topics.length;
			animating = false;
		}, 160);
	}

	function next() { goTo(topicIndex + 1); }
	function prev() { goTo(topicIndex - 1); }

	onMount(() => {
		const t = setInterval(next, 3800);
		return () => clearInterval(t);
	});

	const current = $derived(topics[topicIndex]);

	// Changelog — hardcoded for now, will come from DB
	const changelog = [
		{ date: '2026-06-07', version: '0.2', note: 'Redesign: editorial landing, DFOS-style discover grid, Assembly governance area.' },
		{ date: '2026-06-05', version: '0.1.9', note: 'Amsterdam conversations seeded. PublicSpaces Conference integration. Map defaults to Amsterdam.' },
		{ date: '2026-05-28', version: '0.1.8', note: 'Private beta live. 100+ real conversations. 1,000+ inbound requests at €2–3 CAC.' },
		{ date: '2026-04-15', version: '0.1.5', note: 'Feedback gate, post-meeting reflections, and steward ownership structure committed.' },
		{ date: '2026-03-01', version: '0.1', note: 'First real meetings in Berlin. Invitation flow, slot booking, and map view shipped.' },
		{ date: '2025-12-01', version: '0.0.1', note: 'MVP: conversation prompts, scheduling, Supabase, Cloudflare Pages. First commit.' },
	];
</script>

<svelte:head>
	<title>dyad.</title>
	<meta name="description" content="A collectively owned offline social network. Find the people worth talking to." />
</svelte:head>

<div class="landing-shell">
<!-- ── HEADER ── -->
<header class="site-header">
	<img src="/images/logo.png" alt="dyad." class="logo" />
	<nav class="header-nav">
		<a href="/why" class="nav-link">our origins</a>
		<a href="/newsletter" class="nav-link">field notes</a>
		<button class="nav-link" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
			{#if themeStore.current === 'light'}☀{:else}☾{/if}
		</button>
		<button class="nav-link" onclick={() => openAuth('login')}>log in</button>
		<button class="btn-join" onclick={() => openAuth('waitlist')}>join</button>
	</nav>
</header>

<!-- ── HERO (100vh, Geneva-style rotating) ── -->
<section class="hero">
	<!-- Left: rotating headline + fixed CTA -->
	<div class="hero-left">
		<div class="hero-headline">
			<p class="hero-line1">Find people to talk about</p>
			<h1 class="hero-topic" class:hero-topic--out={animating}>{current.topic}</h1>
			<p class="hero-line3">in {current.city}, in person.</p>
		</div>

		<div class="hero-bottom-group">
			<div class="hero-sub-row">
				<img src="/images/logo.png" alt="dyad." class="hero-logo" />
			</div>
			<div class="hero-actions">
				<button class="btn-join btn-join--hero" onclick={() => openAuth('waitlist')}>join waitlist</button>
				<button class="btn-secondary" onclick={() => openAuth('login')}>log in</button>
			</div>
		</div>
	</div>

	<!-- Right: featured conversation card, swaps with topic -->
	<div class="hero-right">
		{#if data.prompts.length > 0}
			{@const featured = data.prompts[topicIndex % data.prompts.length]}
			<a
				href="#"
				class="hero-card"
				class:hero-card--out={animating}
				onclick={(e) => { e.preventDefault(); openAuth('waitlist'); }}
			>
				{#if featured.cover_image_url}
					<img src={featured.cover_image_url} alt="" class="hero-card-img" />
				{:else}
					<div class="hero-card-placeholder"></div>
				{/if}
				<div class="hero-card-overlay">
					<span class="hero-card-tag"></span>
					<p class="hero-card-title">{featured.title}</p>
					<span class="hero-card-area">Berlin ↗</span>
				</div>
			</a>
		{/if}
	</div>
</section>

<!-- ── ARE.NA-STYLE FOOTER ── -->
<footer class="arena-footer">
	<div class="arena-footer-inner">
		<div class="arena-col">
			<span class="arena-mark">∗∗</span>
			<a href="/why" class="arena-link arena-link--bold">About &amp; mission</a>
			<a href="/newsletter" class="arena-link arena-link--bold">Field notes</a>
			<a href="https://github.com/dyad-berlin" class="arena-link arena-link--bold" target="_blank" rel="noopener">Open source</a>
			<a href="/why" class="arena-link arena-link--bold">Team</a>
			<a href="/assembly" class="arena-link arena-link--bold">Assembly</a>
		</div>

		<div class="arena-col">
			<span class="arena-col-label">Product</span>
			<a href="/discover" class="arena-link">Conversations</a>
			<a href="/discover" class="arena-link">Map</a>
			<a href="/assembly" class="arena-link">Governance</a>
			<a href="/conversations/new" class="arena-link">Start a conversation</a>
		</div>

		<div class="arena-col">
			<span class="arena-col-label">Community</span>
			<button class="arena-link arena-link--btn" onclick={() => openAuth('waitlist')}>Join waitlist</button>
			<a href="/why" class="arena-link">Our story</a>
			<a href="/newsletter" class="arena-link">Zine</a>
			<a href="/assembly" class="arena-link">Monthly Assembly</a>
		</div>

		<div class="arena-col">
			<span class="arena-col-label">Ecosystem</span>
			<a href="https://publicspaces.net" class="arena-link" target="_blank" rel="noopener">PublicSpaces</a>
			<a href="https://purpose-economy.org" class="arena-link" target="_blank" rel="noopener">Purpose Foundation</a>
			<a href="https://github.com/dyad-berlin" class="arena-link" target="_blank" rel="noopener">GitHub</a>
		</div>

		<div class="arena-col">
			<span class="arena-col-label">Info</span>
			<a href="mailto:luna@dyad.berlin" class="arena-link arena-link--bold">Contact</a>
			<a href="/impressum" class="arena-link arena-link--bold">Impressum</a>
			<a href="/datenschutz" class="arena-link arena-link--bold">Datenschutz</a>
			<a href="/impressum" class="arena-link arena-link--bold">Press</a>
		</div>
	</div>
</footer>

</div><!-- /.landing-shell -->

<AuthDialog bind:this={authDialog} />

<style>
	:global(body) { margin: 0; }

	/* ── Page shell ── */
	:global(.landing-shell) {
		display: flex;
		flex-direction: column;
		background: var(--bg-canvas);
	}

	/* ── Header ── */
	.site-header {
		flex-shrink: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 48px;
		background: var(--bg-canvas);
		border-bottom: 1px solid var(--border-link);
	}

	.logo {
		height: 22px;
		width: auto;
		filter: brightness(0) opacity(0.35);
	}
	:global([data-theme='dark']) .logo { filter: none; }

	.header-nav {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.nav-link {
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		padding: 6px 12px;
		border-radius: var(--radius-input);
		text-decoration: none;
		transition: color 0.15s;
	}
	.nav-link:hover { color: var(--text-primary); }

	.btn-join {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		padding: 8px 20px;
		border-radius: var(--radius-pill);
		transition: opacity 0.15s;
	}
	.btn-join:hover { opacity: 0.82; }
	.btn-join--hero {
		font-size: 15px;
		padding: 14px 36px;
		border-radius: var(--radius-pill);
	}

	.btn-secondary {
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		padding: 8px 4px;
		transition: color 0.15s;
	}
	.btn-secondary:hover { color: var(--text-primary); }

	/* ── Hero — exactly 100vh including header ── */
	.hero {
		height: calc(100vh - 56px); /* 56px = header height */
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 48px 48px 32px;
		gap: 48px;
		align-items: center;
		box-sizing: border-box;
	}

	.hero-left {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 8px 0;
	}

	.hero-bottom-group {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Geneva-style rotating headline */
	.hero-headline { display: flex; flex-direction: column; gap: 0; }

	.hero-line1 {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(1.6rem, 3vw, 3rem);
		font-weight: 300;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.1;
	}

	h1.hero-topic {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(2.4rem, 5vw, 5.5rem);
		font-weight: 400;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.0;
		letter-spacing: -0.02em;
		transition: opacity 0.16s ease;
	}

	.hero-topic--out { opacity: 0; }

	.hero-line3 {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(1.6rem, 3vw, 3rem);
		font-weight: 300;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.1;
	}

	.hero-sub-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.hero-brand { display: flex; align-items: center; gap: 16px; }

	.hero-logo {
		height: 28px;
		width: auto;
		filter: brightness(0) opacity(0.3);
	}
	:global([data-theme='dark']) .hero-logo { filter: brightness(0) invert(1) opacity(0.5); }

	.hero-oneliner {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(1rem, 1.6vw, 1.4rem);
		font-weight: 300;
		letter-spacing: -0.01em;
		color: var(--text-muted);
	}

	.hero-nav-arrows { display: flex; gap: 8px; }

	.arrow-btn {
		background: none;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--text-muted);
		font-size: 14px;
		transition: background 0.12s, color 0.12s;
	}
	.arrow-btn:hover { background: var(--bg-control); color: var(--text-primary); }

	.hero-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	/* Hero right: featured conversation card */
	.hero-right {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-card {
		width: 100%;
		max-width: 480px;
		position: relative;
		border-radius: 16px;
		overflow: hidden;
		border: 1px solid var(--border-link);
		background: var(--bg-control);
	}

	.hero-card-img {
		width: 100%;
		aspect-ratio: 4/3;
		object-fit: cover;
		display: block;
	}

	.hero-card-placeholder {
		width: 100%;
		aspect-ratio: 4/3;
		background: var(--bg-control);
	}

	.hero-card-body {
		padding: 20px 24px;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
	}

	.hero-card-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		font-weight: 400;
		line-height: 1.3;
		margin: 0;
		color: var(--text-primary);
		flex: 1;
	}

	.hero-card-area {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(255,255,255,0.7);
	}

	/* hero card overlay (new design) */
	.hero-card-overlay {
		position: absolute;
		bottom: 0; left: 0; right: 0;
		padding: 32px 20px 20px;
		background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.hero-card-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		color: rgba(255,255,255,0.5);
	}

	/* ── Are.na-style footer ── */
	.arena-footer {
		background: #d8d8e8;
		padding: 64px 48px 80px;
	}
	:global([data-theme='dark']) .arena-footer { background: #1a1a2e; }

	.arena-footer-inner {
		display: grid;
		grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
		gap: 40px;
		max-width: 1440px;
		margin: 0 auto;
	}

	.arena-col {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.arena-mark {
		font-size: 18px;
		color: var(--text-primary);
		margin-bottom: 8px;
		display: block;
	}

	.arena-col-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin-bottom: 6px;
		display: block;
	}

	.arena-link {
		font-size: 14px;
		font-weight: 400;
		color: var(--text-primary);
		text-decoration: none;
		transition: opacity 0.15s;
		line-height: 1.6;
	}
	.arena-link:hover { opacity: 0.55; }
	.arena-link--bold { font-weight: 500; }
	.arena-link--btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-align: left;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		font-family: inherit;
		transition: opacity 0.15s;
	}
	.arena-link--btn:hover { opacity: 0.55; }

	@media (max-width: 900px) {
		.arena-footer-inner { grid-template-columns: 1fr 1fr; gap: 32px; }
		.arena-footer { padding: 48px 24px 64px; }
	}

	.section-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 32px;
	}

	/* ── Not building ── */
	.not-building {
		margin-top: 64px;
		padding-top: 48px;
		border-top: 1px solid var(--border-link);
	}

	/* ── Docs ── */
	.docs-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 80px;
		margin-bottom: 64px;
	}

	.docs-h2 {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(1.6rem, 2.8vw, 2.4rem);
		font-weight: 300;
		line-height: 1.2;
		letter-spacing: -0.01em;
		margin: 0;
		color: var(--text-primary);
	}

	.docs-right p {
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-muted);
		margin: 0 0 16px;
	}

	.docs-links {
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
		margin-top: 8px;
	}

	.doc-link {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.doc-link:hover { color: var(--text-primary); }

	/* Principles */
	.principles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--border-link);
		border: 1px solid var(--border-link);
	}

	.principle {
		background: var(--bg-canvas);
		padding: 32px 28px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.principle-n {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		color: var(--text-muted);
	}

	.principle-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		font-weight: 400;
		margin: 0;
		color: var(--text-primary);
	}

	.principle-body {
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-muted);
		margin: 0;
	}

	/* ── Changelog ── */
	.changelog {
		display: flex;
		flex-direction: column;
	}

	.changelog-row {
		display: grid;
		grid-template-columns: 110px 60px 1fr;
		gap: 24px;
		align-items: baseline;
		padding: 16px 0;
		border-bottom: 1px solid var(--border-link);
	}
	.changelog-row:first-child { border-top: 1px solid var(--border-link); }

	.changelog-date {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.changelog-version {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		opacity: 0.6;
	}

	.changelog-note {
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-primary);
		margin: 0;
	}

	/* ── Field Notes ── */
	.notes-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 32px;
	}
	.notes-header .section-label { margin-bottom: 0; }

	.notes-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 32px;
	}

	.note-card {
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 16px;
		transition: opacity 0.15s;
	}
	.note-card:hover { opacity: 0.72; }

	.note-img {
		width: 100%;
		aspect-ratio: 4/3;
		overflow: hidden;
		background: var(--bg-control);
	}
	.note-img img { width: 100%; height: 100%; object-fit: cover; display: block; }

	.note-body { display: flex; flex-direction: column; gap: 8px; }

	.note-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.05rem;
		font-weight: 400;
		line-height: 1.3;
		margin: 0;
		color: var(--text-primary);
	}

	.note-teaser {
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-muted);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.note-date {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	/* ── Footer (Are.na style) ── */
	.site-footer {
		background: var(--bg-control);
		padding: 80px 48px;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: 1.5fr 1fr 1fr 1fr;
		gap: 48px;
	}

	.footer-logo {
		height: 20px;
		width: auto;
		filter: brightness(0) opacity(0.3);
		display: block;
		margin-bottom: 28px;
	}
	:global([data-theme='dark']) .footer-logo { filter: brightness(0) invert(1) opacity(0.3); }

	.footer-col-title {
		display: block;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 16px;
	}

	.footer-nav {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.footer-link {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		text-decoration: none;
		transition: opacity 0.15s;
		font-family: inherit;
	}
	.footer-link:hover { opacity: 0.55; }
	.footer-link--btn {
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		padding: 0;
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		color: var(--text-primary);
		transition: opacity 0.15s;
	}
	.footer-link--btn:hover { opacity: 0.55; }

	/* ── Responsive ── */
	@media (max-width: 1024px) {
		.principles { grid-template-columns: repeat(2, 1fr); }
		.footer-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
	}

	@media (max-width: 768px) {
		.site-header { padding: 14px 24px; }
		.hero { grid-template-columns: 1fr; padding: 80px 24px 48px; gap: 40px; }
		.hero-right { display: none; }
		.section { padding: 60px 24px; }
		.docs-grid { grid-template-columns: 1fr; gap: 32px; }
		.principles { grid-template-columns: 1fr; }
		.notes-grid { grid-template-columns: 1fr; }
		.changelog-row { grid-template-columns: 90px 1fr; gap: 12px; }
		.changelog-version { display: none; }
		.footer-grid { grid-template-columns: 1fr 1fr; }
		.site-footer { padding: 48px 24px; }
	}
</style>
