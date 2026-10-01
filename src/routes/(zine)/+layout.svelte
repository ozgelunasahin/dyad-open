<script lang="ts">
	import { page } from '$app/stores';
	import ZineFooter from '$lib/components/ZineFooter.svelte';
	let { children } = $props();

	// The newsletter (Unfolding is its first series; more will follow) keeps
	// the header (for nav) but floats it (position: fixed, scroll-aware
	// reveal below) over its hero/paper background instead of sitting sticky
	// in normal flow like the rest of the zine.
	const isUnfolding = $derived($page.url.pathname.startsWith('/newsletter'));

	// Scroll-aware reveal (Atmos-style): dissolves on scroll down, reappears
	// on scroll up, always visible near the top. Scoped to /newsletter — the
	// only variant that's floated (position: fixed) over its content rather
	// than sitting in normal flow.
	let headerHidden = $state(false);
	let lastScrollY = 0;

	function onScroll() {
		if (!isUnfolding) return;
		const y = window.scrollY;
		if (y < 80) {
			headerHidden = false;
		} else if (y > lastScrollY) {
			headerHidden = true; // scrolling down
		} else if (y < lastScrollY) {
			headerHidden = false; // scrolling up
		}
		lastScrollY = y;
	}

	// Full-screen menu overlay (Atmos-style: atmos.earth's own Menu opens a
	// full white takeover with a handful of huge serif links, not a small
	// dropdown). Closes on Escape, on backdrop click via the Close button,
	// or the instant a link is followed.
	let menuOpen = $state(false);

	function closeMenu() {
		menuOpen = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (menuOpen && e.key === 'Escape') closeMenu();
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = menuOpen ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	});
</script>

<svelte:window onscroll={onScroll} onkeydown={onKeydown} />

<div class="zine-shell">
	<header
		class="zine-header zine-header-centered"
		class:zine-header-transparent={isUnfolding}
		class:zine-header-hidden={isUnfolding && headerHidden}
	>
		<!-- Menu at left opens the full-screen overlay below; DYAD sits
		     centered, an empty spacer on the right balances the grid so the
		     wordmark centers regardless of the trigger's width. One header
		     shared by every zine page — Unfolding is the only variant that
		     floats (fixed + scroll-hide) over a hero. -->
		<button type="button" class="zine-menu-toggle" onclick={() => (menuOpen = true)}>Menu</button>
		<a href="/" class="zine-wordmark zine-wordmark-centered">DYAD</a>
		<span class="zine-header-spacer" aria-hidden="true"></span>
	</header>

	{#if menuOpen}
		<div class="zine-menu-overlay">
			<div class="zine-menu-bar">
				<button type="button" class="zine-menu-toggle" onclick={closeMenu}>Close</button>
				<a href="/" class="zine-wordmark zine-wordmark-centered" onclick={closeMenu}>DYAD</a>
				<span class="zine-header-spacer" aria-hidden="true"></span>
			</div>

			<nav class="zine-menu-primary" aria-label="Sections">
				<a href="/docs" onclick={closeMenu}>Documentation</a>
				<a href="/wiggling" onclick={closeMenu}>Wiggling</a>
				<a href="/newsletter" onclick={closeMenu}>Newsletter</a>
			</nav>

			<!-- Governance isn't listed here — it's a subsection reachable from
			     Documentation and the footer, not a peer destination
			     at the same level as the menu's sections or these actions. -->
			<nav class="zine-menu-secondary" aria-label="Membership">
				<a href="/signup" onclick={closeMenu}>Become a member</a>
				<a href="/login" onclick={closeMenu}>Sign in</a>
			</nav>
		</div>
	{/if}

	<main class="zine-main">
		{@render children()}
	</main>

	<ZineFooter />
</div>

<style>
	:global(body) { margin: 0; overflow: auto; }
	:global(html) { scroll-behavior: smooth; }

	/* The zine reads as paper — the same warm off-white grain as Unfolding
	   (see its +layout.svelte), now the base for the whole section rather
	   than a surface floating over dark chrome. Named locals carry the few
	   values that have no clean app.css token. */
	.zine-shell {
		--zine-bg: #faf8f3;
		--zine-bg-translucent: rgba(250, 248, 243, 0.92);
		/* The paper ink hue as a bare rgb triple — docs/+page.svelte layers its
		   own alpha steps on top via rgba(var(--zine-ink-rgb), N). */
		--zine-ink-rgb: 27, 28, 30;
		--zine-ink: rgba(var(--zine-ink-rgb), 0.8);
		--zine-ink-strong: rgba(var(--zine-ink-rgb), 0.9);
		--zine-ink-muted: rgba(var(--zine-ink-rgb), 0.35);
		--zine-hairline: rgba(20, 20, 20, 0.08);

		min-height: 100vh;
		background: var(--zine-bg);
		color: var(--zine-ink);
		display: flex;
		flex-direction: column;
	}

	/* Paper grain — same treatment as Unfolding's .paper::before/::after:
	   multiply blend darkens slightly, reading as dust on paper rather than
	   the brightening "screen" grain the dark theme used. */
	.zine-shell::before,
	.zine-shell::after {
		content: '';
		position: fixed;
		inset: 0;
		pointer-events: none;
	}
	.zine-shell::before {
		opacity: 0.05;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
	}
	.zine-shell::after {
		opacity: 0.06;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.006' numOctaves='4' seed='7' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='900' height='900' filter='url(%23p)'/></svg>");
		background-size: 900px 900px;
	}

	/* ── Header ── */
	/* The sticky header sits above the shell's fixed grain overlays, so it
	   carries its own paper tint and grain rather than reading as a flat fill. */
	.zine-header {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 48px;
		background: var(--zine-bg-translucent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--zine-hairline);
	}
	.zine-header::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.05;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
	}

	/* Unfolding's header sits in normal flow, like Atmos's own white bar:
	   solid fill matching the paper ground, pushing the hero image down
	   rather than floating over it, so there's real margin from the top. */
	.zine-header-transparent {
		background: #faf8f3;
		backdrop-filter: none;
		border-bottom: 1px solid rgba(20, 20, 20, 0.08);
		opacity: 1;
		transform: translateY(0);
		transition: opacity 0.35s var(--ease-ink, ease), transform 0.35s var(--ease-ink, ease);
	}
	.zine-header-transparent::before { display: none; }
	.zine-header-transparent .zine-wordmark,
	.zine-header-transparent .zine-menu-toggle {
		color: #1b1c1e;
	}

	/* Dissolves on scroll down, reappears on scroll up (see onScroll above). */
	.zine-header-hidden {
		opacity: 0;
		transform: translateY(-12px);
		pointer-events: none;
	}

	/* Atmos layout: Menu at left, DYAD centered, an empty spacer at right
	   balances the grid so the wordmark centers regardless of the Menu
	   button's own width — three equal-ish columns instead of the default
	   flex space-between. */
	.zine-header-centered {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
	}

	.zine-wordmark-centered {
		justify-self: center;
	}

	.zine-header-spacer {
		justify-self: end;
	}

	/* The trigger/close control — same small tracked label either side of
	   the toggle, but SangBleu Sunrise throughout (menu text reads as one
	   family with the wordmark, not the mono chrome font). justify-self:
	   start pulls it to the header's left column since it's now a plain
	   button, not the <details> element that used to anchor it. */
	.zine-menu-toggle {
		justify-self: start;
		font-family: var(--font-serif);
		font-size: 0.8rem;
		letter-spacing: 0.02em;
		color: var(--zine-ink-muted);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		user-select: none;
		transition: color 0.15s;
	}
	.zine-menu-toggle:hover { color: rgba(27, 28, 30, 0.85); }

	.zine-wordmark {
		font-family: var(--font-serif);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--zine-ink-strong);
		text-decoration: none;
	}

	/* ── Full-screen menu overlay (Atmos-style) ── */
	.zine-menu-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		background: var(--zine-bg);
		overflow-y: auto;
	}

	.zine-menu-bar {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 20px 48px;
		flex: none;
	}

	/* Big, elegant, centered — the same measure Atmos gives its Features /
	   Magazine / Podcast / Newsletters stack. SangBleu Sunrise Light carries
	   the thin-stroke editorial weight at this size natively. */
	.zine-menu-primary {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(4px, 1vw, 12px);
		padding: 24px 24px;
	}

	.zine-menu-primary a {
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: clamp(2.2rem, 6vw, 4.4rem);
		line-height: 1.15;
		color: var(--zine-ink-strong);
		text-decoration: none;
		transition: color 0.15s;
	}
	.zine-menu-primary a:hover { color: #4a5d3f; }

	.zine-menu-secondary {
		flex: none;
		display: flex;
		justify-content: center;
		gap: 40px;
		padding: 0 24px 56px;
	}

	/* Futura, not SangBleu — this row is utility-tier (governance, account
	   actions), same geometric-sans treatment as the docs h1/h2 (see
	   docs/+page.svelte), distinct from the big serif section names above. */
	.zine-menu-secondary a {
		font-family: Futura, 'Futura PT', 'Avenir Next', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--zine-ink-muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.zine-menu-secondary a:hover { color: rgba(27, 28, 30, 0.85); }

	/* ── Main ── */
	.zine-main {
		flex: 1;
	}

	/* ── Shared zine page chrome (hoisted from the 3 pages). The pages render
	   this markup inside <main>, so the selectors must be :global — scoped
	   layout styles do not reach slotted page content. Page-specific bits
	   (.page-title sizing, the various card grids) stay in each page. ── */
	:global(.zine-main .page) {
		max-width: 1080px;
		margin: 0 auto;
		padding: 80px 48px 120px;
	}

	:global(.zine-main .page-intro) {
		margin-bottom: 56px;
		padding-bottom: 48px;
		border-bottom: 1px solid rgba(27, 28, 30, 0.07);
	}

	:global(.zine-main .page-body) {
		display: grid;
		grid-template-columns: 160px 1fr;
		gap: 64px;
		align-items: start;
	}

	:global(.zine-main .section-label) {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(27, 28, 30, 0.28);
		margin: 0 0 20px;
	}

	:global(.zine-main .page-attr) {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		color: rgba(27, 28, 30, 0.25);
		margin: 0;
	}

	/* ── Sticky TOC ── */
	:global(.zine-main .toc) {
		position: sticky;
		top: 80px;
		height: fit-content;
	}

	:global(.zine-main .toc-label) {
		font-family: var(--font-mono);
		font-size: 0.52rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(27, 28, 30, 0.2);
		margin: 0 0 14px;
	}

	:global(.zine-main .toc-list) {
		list-style: none;
		margin: 0;
		padding: 0;
		counter-reset: toc-counter;
	}

	:global(.zine-main .toc-list li) {
		display: flex;
		align-items: baseline;
		gap: 8px;
		counter-increment: toc-counter;
		padding: 7px 0;
		border-bottom: 1px solid rgba(27, 28, 30, 0.04);
	}

	:global(.zine-main .toc-list li:last-child) { border-bottom: none; }

	:global(.zine-main .toc-list li::before) {
		content: counter(toc-counter, decimal-leading-zero);
		font-family: var(--font-mono);
		font-size: 0.48rem;
		letter-spacing: 0.04em;
		color: rgba(27, 28, 30, 0.15);
		flex-shrink: 0;
		transition: color 0.15s;
	}

	:global(.zine-main .toc-list a) {
		font-family: var(--font-serif);
		font-size: 0.78rem;
		font-weight: 300;
		color: rgba(27, 28, 30, 0.38);
		text-decoration: none;
		line-height: 1.35;
		transition: color 0.15s;
	}

	:global(.zine-main .toc-list a:hover) { color: rgba(27, 28, 30, 0.75); }

	:global(.zine-main .toc-list a.active) {
		color: rgba(27, 28, 30, 0.88);
		font-weight: 400;
	}

	:global(.zine-main .toc-list li:has(a.active)::before) {
		color: rgba(27, 28, 30, 0.4);
	}

	:global(.zine-main .toc-list a.past) {
		color: rgba(27, 28, 30, 0.18);
	}

	/* ── Prose ── */
	:global(.zine-main .prose section) {
		padding: 56px 0;
		border-bottom: 1px solid rgba(27, 28, 30, 0.05);
	}

	:global(.zine-main .prose section:first-child) { padding-top: 0; }
	:global(.zine-main .prose section:last-child) { border-bottom: none; }

	:global(.zine-main .section-h2) {
		font-family: var(--font-serif);
		font-size: clamp(1.3rem, 2.5vw, 1.75rem);
		font-weight: 400;
		color: rgba(27, 28, 30, 0.88);
		margin: 0 0 28px;
		line-height: 1.2;
	}

	:global(.zine-main .prose p) {
		font-family: var(--font-serif);
		font-size: 1rem;
		font-weight: 300;
		color: rgba(27, 28, 30, 0.6);
		line-height: 1.8;
		margin: 0 0 20px;
	}

	:global(.zine-main .prose strong) {
		color: rgba(27, 28, 30, 0.85);
		font-weight: 400;
	}

	/* ── Mobile ── */
	@media (max-width: 640px) {
		.zine-header {
			padding: 16px 20px;
		}
		.zine-menu-bar {
			padding: 16px 20px;
		}
		.zine-menu-secondary {
			gap: 24px;
		}
	}

	@media (max-width: 760px) {
		:global(.zine-main .page) { padding: 40px 20px 80px; }
		:global(.zine-main .page-body) { grid-template-columns: 1fr; gap: 0; }
		:global(.zine-main .toc) {
			position: static;
			margin-bottom: 40px;
			border-bottom: 1px solid rgba(27, 28, 30, 0.07);
			padding-bottom: 32px;
		}
	}
</style>
