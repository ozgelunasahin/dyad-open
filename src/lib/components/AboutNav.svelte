<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { copy } from '$lib/copy';
	import { searchItems } from '$lib/utils/search.js';

	export interface NavSearchItem {
		href: string;
		title: string;
		/** Day and place, shown under the title. */
		meta: string;
		/** Extra text the search can match on. */
		text?: string;
		cover?: string | null;
	}

	interface Props {
		items: NavSearchItem[];
		/** '' on /about itself, '/about' from any other page. */
		base?: string;
	}

	let { items, base = '' }: Props = $props();

	const t = copy.about;
	type Mode = 'search' | 'menu' | null;
	let mode = $state<Mode>(null);
	let query = $state('');
	let input = $state<HTMLInputElement>();

	const liveQuery = $derived(query.trim());
	// searchItems scores the shared SearchableItem shape; map ours onto it.
	const results = $derived.by(() => {
		const byHref = new Map(items.map((i) => [i.href, i]));
		const hits = searchItems(
			items.map((i) => ({
				id: i.href,
				title: i.title,
				body_text: i.text ?? '',
				cover_image_url: i.cover ?? null,
				username: '',
				soonest_slot: null
			})),
			liveQuery
		);
		return hits.map((h) => byHref.get(h.id)!).filter(Boolean);
	});

	const links = $derived([
		[t.navAbout, `${base}#conversation`],
		[t.navHow, `${base}#how`],
		[t.navPrinciples, `${base}#principles`],
		[t.navUpcoming, `${base}#upcoming`]
	]);

	function open(next: Exclude<Mode, null>) {
		mode = mode === next ? null : next;
		query = '';
		if (mode === 'search') queueMicrotask(() => input?.focus());
	}
	function close() {
		mode = null;
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && mode) {
			e.stopPropagation();
			close();
		}
	}

	// Lock page scroll while a panel covers the screen.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = mode ? 'hidden' : '';
	});
	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = '';
	});
</script>

<svelte:window onkeydown={onKey} />

<nav class="nav" class:open={mode !== null} aria-label="Main">
	<div class="bar">
		<button
			type="button"
			class="icon-btn"
			aria-label={mode === 'search' ? t.navClose : t.navSearch}
			aria-expanded={mode === 'search'}
			onclick={() => open('search')}
		>
			{#if mode === 'search'}
				<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
			{:else}
				<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
			{/if}
		</button>
		<a href="/" class="wordmark" aria-label={`${t.brandName}, home`} onclick={close}>{t.brandName}</a>
		<button
			type="button"
			class="icon-btn end"
			aria-label={mode === 'menu' ? t.navClose : t.navMenu}
			aria-expanded={mode === 'menu'}
			onclick={() => open('menu')}
		>
			{#if mode === 'menu'}
				<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
			{:else}
				<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 9h16M4 15h16" /></svg>
			{/if}
		</button>
	</div>

	{#if mode === 'menu'}
		<div class="panel menu" transition:fade={{ duration: 160 }}>
			<ul>
				{#each links as [label, href]}
					<li><a {href} onclick={close}>{label}</a></li>
				{/each}
			</ul>
			<a class="member" href="/membership" onclick={close}>{t.navJoin}</a>
		</div>
	{:else if mode === 'search'}
		<div class="panel search" transition:fade={{ duration: 160 }}>
			<input
				bind:this={input}
				bind:value={query}
				class="search-input"
				placeholder={copy.discover.searchPlaceholder}
				aria-label={t.navSearch}
				autocomplete="off"
				spellcheck="false"
			/>
			{#if liveQuery.length < 2}
				<p class="label">{t.navLatest}</p>
				<ul class="results">
					{#each items.slice(0, 3) as r (r.href)}
						<li>{@render row(r)}</li>
					{/each}
				</ul>
			{:else if results.length === 0}
				<p class="label">{copy.discover.noResults}</p>
			{:else}
				<ul class="results">
					{#each results as r (r.href)}
						<li>{@render row(r)}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</nav>

{#snippet row(r: NavSearchItem)}
	<a href={r.href} onclick={close}>
		<span class="r-meta">{r.meta}</span>
		<span class="r-title">{r.title}</span>
	</a>
{/snippet}

<style>
	@font-face {
		font-family: 'BBH Hegarty';
		src: url('/fonts/BBHHegarty-Regular-latin.woff2') format('woff2');
		font-weight: 400;
		font-display: swap;
	}

	.nav {
		--frame: clamp(8px, 1.2vw, 16px);
		--paper: #fffdf8;
		--deep: #101c3b;
		--accent: #2f4f9e;
		--light: #a9bde6;
		--light-soft: #dfe7f6;
		--lift:
			0 1px 2px rgba(16, 28, 59, 0.06),
			0 8px 20px -6px rgba(16, 28, 59, 0.1),
			0 28px 56px -20px rgba(16, 28, 59, 0.22);
		position: fixed;
		top: calc(var(--frame) + 8px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		box-sizing: border-box;
		/* Compact pill: search, name, menu. */
		width: min(calc(100% - 4 * var(--frame)), 26rem);
		height: 3.5rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--paper);
		color: var(--deep);
		font-family: var(--font-serif);
		border-radius: 16px;
		box-shadow: var(--lift);
		transition: width 0.35s ease, height 0.35s ease;
	}
	/* Opened, it takes over most of the screen and the bar stays on top. */
	.nav.open {
		width: min(calc(100% - 2 * var(--frame)), 60rem);
		height: calc(100dvh - 2 * var(--frame) - 16px);
		border-radius: var(--radius, 24px);
	}

	.bar {
		flex: none;
		height: 3.5rem;
		display: grid;
		grid-template-columns: 3rem 1fr 3rem;
		align-items: center;
		padding: 0 0.4rem;
	}
	.wordmark {
		justify-self: center;
		font-family: 'BBH Hegarty', var(--font-serif);
		font-size: clamp(0.95rem, 1.4vw, 1.2rem);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		white-space: nowrap;
		color: inherit;
		text-decoration: none;
	}
	.icon-btn {
		width: 2.75rem;
		height: 2.75rem;
		display: grid;
		place-items: center;
		border: 0;
		background: transparent;
		color: inherit;
		border-radius: 999px;
		cursor: pointer;
	}
	.icon-btn.end { justify-self: end; }
	.icon-btn:hover { background: var(--light-soft); }
	svg { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }

	.panel {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: clamp(1.5rem, 5vh, 4rem) var(--pad-x, clamp(1.25rem, 6vw, 7rem)) 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	/* Menu: big links in the display face. */
	.menu { justify-content: center; gap: clamp(1.5rem, 5vh, 3rem); }
	.menu ul { list-style: none; margin: 0; padding: 0; display: grid; gap: clamp(0.4rem, 1.5vh, 1rem); }
	.menu li a {
		font-family: 'BBH Hegarty', var(--font-serif);
		text-transform: uppercase;
		font-size: clamp(1.6rem, min(4vw, 7vh), 3.4rem);
		line-height: 1.05;
		color: inherit;
		text-decoration: none;
	}
	.menu li a:hover { color: var(--accent); }
	.member {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 1.8rem;
		border-radius: 999px;
		background: var(--deep);
		color: var(--paper);
		text-decoration: none;
		font-size: 0.95rem;
	}
	.member:hover { background: var(--accent); }

	/* Search: the same shape as the discover overlay, large and centred. */
	.search { justify-content: flex-start; padding-top: clamp(3rem, 14vh, 9rem); }
	.search-input {
		width: 100%;
		max-width: 60rem;
		background: transparent;
		border: 0;
		outline: 0;
		text-align: center;
		color: inherit;
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: clamp(2.2rem, 9vw, 5.5rem);
		caret-color: var(--deep);
	}
	.search-input::placeholder { color: rgba(16, 28, 59, 0.3); }
	.label {
		margin: clamp(2rem, 8vh, 5rem) 0 1rem;
		font-size: 1.1rem;
		opacity: 0.6;
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
		max-width: 44rem;
		display: grid;
		gap: 0.6rem;
		text-align: left;
	}
	.search .results:not(:first-of-type) { margin-top: 0; }
	.results a {
		display: grid;
		gap: 0.3rem;
		padding: 1rem 1.2rem;
		border-radius: 12px;
		background: var(--light-soft);
		color: inherit;
		text-decoration: none;
	}
	.results a:hover { background: var(--light); }
	.r-meta { font-size: 0.9rem; opacity: 0.7; }
	.r-title {
		font-family: 'BBH Hegarty', var(--font-serif);
		text-transform: uppercase;
		font-size: 1.05rem;
		line-height: 1.15;
	}

	a:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

	@media (prefers-reduced-motion: reduce) {
		.nav { transition: none; }
	}
</style>
