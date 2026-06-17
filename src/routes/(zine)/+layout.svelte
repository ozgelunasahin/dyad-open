<script lang="ts">
	import ZineFooter from '$lib/components/ZineFooter.svelte';
	let { children } = $props();
</script>

<div class="zine-shell" data-theme="dark">
	<header class="zine-header">
		<a href="/" class="zine-wordmark">DYAD</a>
		<nav class="zine-nav">
			<a href="/steward-ownership" class="zine-nav-link">steward ownership</a>
			<a href="/governance" class="zine-nav-link">participatory governance</a>
			<a href="/community-care" class="zine-nav-link">trust, safety &amp; community care</a>
		</nav>
		<!-- Mobile: the inline nav is hidden; this disclosure keeps the section
		     links reachable and in the a11y tree on small screens. -->
		<details class="zine-nav-mobile">
			<summary aria-label="Sections">Sections</summary>
			<nav class="zine-nav-mobile-links">
				<a href="/steward-ownership" class="zine-nav-link">steward ownership</a>
				<a href="/governance" class="zine-nav-link">participatory governance</a>
				<a href="/community-care" class="zine-nav-link">trust, safety &amp; community care</a>
			</nav>
		</details>
	</header>

	<main class="zine-main">
		{@render children()}
	</main>

	<ZineFooter />
</div>

<style>
	:global(body) { margin: 0; overflow: auto; }
	:global(html) { scroll-behavior: smooth; }

	/* The zine is a dark surface. Named locals carry the few values that have
	   no clean app.css token; everything else maps onto the [data-theme="dark"]
	   tokens via the wrapper above. */
	.zine-shell {
		--zine-bg: #080808;
		--zine-bg-translucent: rgba(8, 8, 8, 0.92);
		--zine-ink: rgba(240, 236, 230, 0.8);
		--zine-ink-strong: rgba(240, 236, 230, 0.9);
		--zine-ink-muted: rgba(240, 236, 230, 0.35);
		--zine-hairline: rgba(240, 236, 230, 0.05);

		min-height: 100vh;
		background: var(--zine-bg);
		color: var(--zine-ink);
		display: flex;
		flex-direction: column;
	}

	/* ── Header ── */
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

	.zine-wordmark {
		font-family: var(--font-serif);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--zine-ink-strong);
		text-decoration: none;
	}

	.zine-nav {
		display: flex;
		gap: 32px;
	}

	.zine-nav-link {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		color: var(--zine-ink-muted);
		text-decoration: none;
		transition: color 0.15s;
	}

	.zine-nav-link:hover {
		color: rgba(240, 236, 230, 0.85);
	}

	/* Mobile section disclosure — hidden on desktop. */
	.zine-nav-mobile {
		display: none;
	}

	.zine-nav-mobile summary {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		color: var(--zine-ink-muted);
		cursor: pointer;
		list-style: none;
	}

	.zine-nav-mobile summary::-webkit-details-marker { display: none; }

	.zine-nav-mobile-links {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 12px;
	}

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
		border-bottom: 1px solid rgba(240, 236, 230, 0.07);
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
		color: rgba(240, 236, 230, 0.28);
		margin: 0 0 20px;
	}

	:global(.zine-main .page-attr) {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.25);
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
		color: rgba(240, 236, 230, 0.2);
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
		border-bottom: 1px solid rgba(240, 236, 230, 0.04);
	}

	:global(.zine-main .toc-list li:last-child) { border-bottom: none; }

	:global(.zine-main .toc-list li::before) {
		content: counter(toc-counter, decimal-leading-zero);
		font-family: var(--font-mono);
		font-size: 0.48rem;
		letter-spacing: 0.04em;
		color: rgba(240, 236, 230, 0.15);
		flex-shrink: 0;
		transition: color 0.15s;
	}

	:global(.zine-main .toc-list a) {
		font-family: var(--font-serif);
		font-size: 0.78rem;
		font-weight: 300;
		color: rgba(240, 236, 230, 0.38);
		text-decoration: none;
		line-height: 1.35;
		transition: color 0.15s;
	}

	:global(.zine-main .toc-list a:hover) { color: rgba(240, 236, 230, 0.75); }

	:global(.zine-main .toc-list a.active) {
		color: rgba(240, 236, 230, 0.88);
		font-weight: 400;
	}

	:global(.zine-main .toc-list li:has(a.active)::before) {
		color: rgba(240, 236, 230, 0.4);
	}

	:global(.zine-main .toc-list a.past) {
		color: rgba(240, 236, 230, 0.18);
	}

	/* ── Prose ── */
	:global(.zine-main .prose section) {
		padding: 56px 0;
		border-bottom: 1px solid rgba(240, 236, 230, 0.05);
	}

	:global(.zine-main .prose section:first-child) { padding-top: 0; }
	:global(.zine-main .prose section:last-child) { border-bottom: none; }

	:global(.zine-main .section-h2) {
		font-family: var(--font-serif);
		font-size: clamp(1.3rem, 2.5vw, 1.75rem);
		font-weight: 400;
		color: rgba(240, 236, 230, 0.88);
		margin: 0 0 28px;
		line-height: 1.2;
	}

	:global(.zine-main .prose p) {
		font-family: var(--font-serif);
		font-size: 1rem;
		font-weight: 300;
		color: rgba(240, 236, 230, 0.6);
		line-height: 1.8;
		margin: 0 0 20px;
	}

	:global(.zine-main .prose strong) {
		color: rgba(240, 236, 230, 0.85);
		font-weight: 400;
	}

	/* ── Mobile ── */
	@media (max-width: 640px) {
		.zine-header {
			padding: 16px 20px;
			flex-wrap: wrap;
		}

		.zine-nav {
			display: none;
		}

		.zine-nav-mobile {
			display: block;
		}
	}

	@media (max-width: 760px) {
		:global(.zine-main .page) { padding: 40px 20px 80px; }
		:global(.zine-main .page-body) { grid-template-columns: 1fr; gap: 0; }
		:global(.zine-main .toc) {
			position: static;
			margin-bottom: 40px;
			border-bottom: 1px solid rgba(240, 236, 230, 0.07);
			padding-bottom: 32px;
		}
	}
</style>
