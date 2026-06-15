<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ConstellationCard } from '$lib/types/constellation.js';

	interface Props {
		cards: ConstellationCard[];
		onWaitlist?: () => void;
	}
	let { cards, onWaitlist }: Props = $props();

	let resourcesOpen = $state(false);

	const GRADIENTS = [
		['#1a1a2e', '#16213e'],
		['#0d1b2a', '#1b263b'],
		['#1b1b2f', '#2e2e4f'],
		['#0f2027', '#203a43'],
		['#1a0533', '#2d1b69'],
		['#0c1821', '#1f3a4a'],
	];

	const orbitCards = cards.slice(0, 14);
	const extraTilts = orbitCards.map(() => (Math.random() - 0.5) * 14);

	let selectedCard = $state<ConstellationCard | null>(null);
	const cardEls = new Map<string, HTMLDivElement>();
	let rafId: number;
	let angle = 0;
	let paused = false;

	function tick() {
		if (!paused) angle += 0.004;

		const cx = window.innerWidth / 2;
		const cy = window.innerHeight * 0.46;
		const r = window.innerWidth * 0.44;
		const n = orbitCards.length;

		for (let i = 0; i < n; i++) {
			const el = cardEls.get(orbitCards[i].id);
			if (!el) continue;
			const a = angle + (i / n) * Math.PI * 2;
			const x = cx + r * Math.cos(a);
			const y = cy + r * Math.sin(a);
			const tilt = Math.cos(a) * 15 + extraTilts[i];
			const depth = (Math.sin(a) + 1) / 2;
			const scale = 0.55 + 0.48 * depth;
			const opacity = 0.36 + 0.64 * depth;
			// Pure transform — iOS Safari correctly updates hit-test rects for
			// GPU-composited transforms; left/top changes do not update them
			el.style.transform = `translate(${x - 36}px, ${y - 42}px) rotate(${tilt}deg) scale(${scale})`;
			el.style.opacity = opacity.toFixed(2);
			el.style.zIndex = String(Math.round(depth * 20));
			el.style.boxShadow =
				selectedCard?.id === orbitCards[i].id
					? '0 0 0 2px rgba(255,255,255,0.7), 0 6px 24px rgba(0,0,0,0.6)'
					: '0 4px 18px rgba(0,0,0,0.55)';
		}
		rafId = requestAnimationFrame(tick);
	}

	function registerCard(el: HTMLDivElement, id: string) {
		cardEls.set(id, el);
		return { destroy() { cardEls.delete(id); } };
	}

	function tapCard(card: ConstellationCard) {
		selectedCard = card;
		paused = true;
	}

	function dismiss() {
		selectedCard = null;
		paused = false;
	}

	onMount(() => {
		rafId = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		cancelAnimationFrame(rafId);
	});
</script>

<!-- ── Section 1: orbit ring (first screen) ── -->
<div class="orbit-section">
	{#each orbitCards as card, i}
		<div
			class="card-thumb"
			use:registerCard={card.id}
			onclick={() => tapCard(card)}
			role="button"
			tabindex={0}
			onkeydown={(e) => e.key === 'Enter' && tapCard(card)}
			aria-label={card.title ?? 'conversation'}
		>
			{#if card.cover_image_url}
				<img src={card.cover_image_url} alt="" class="thumb-img" />
			{:else}
				<div
					class="thumb-gradient"
					style="background: linear-gradient(135deg, {GRADIENTS[i % GRADIENTS.length][0]}, {GRADIENTS[i % GRADIENTS.length][1]})"
				></div>
			{/if}
			{#if card.archived}<div class="arch-pip"></div>{/if}
		</div>
	{/each}

	<div class="orbit-center">
		<p class="tagline">the offline social network<br />owned by its community</p>
		<div class="cta-row">
			<button class="cta cta-primary" onclick={() => onWaitlist?.()}>join</button>
			<a href="/field-notes" class="cta">explore</a>
		</div>
		<p class="orbit-hint">in beta, in berlin</p>
	</div>
	<p class="orbit-hint-below">tap a conversation card for a sneak peek</p>
</div>

<!-- ── Fixed slide-up preview panel ── -->
<div class="preview-panel" class:preview-panel--open={selectedCard !== null} aria-hidden={selectedCard === null}>
	<div class="preview-inner">
		<button class="teaser-close" onclick={dismiss} aria-label="close">×</button>
		{#if selectedCard}
			{#if selectedCard.archived}
				<p class="teaser-badge">FROM THE ARCHIVES</p>
			{/if}
			<p class="teaser-title">{selectedCard.title ?? 'Untitled'}</p>
			{#if selectedCard.snippet}
				<p class="teaser-snippet">{selectedCard.snippet}</p>
			{/if}
			<p class="teaser-author">{selectedCard.author_username}</p>
			<button
				class="teaser-cta"
				onclick={() => { dismiss(); onWaitlist?.(); }}
			>join to read</button>
		{/if}
	</div>
</div>

<!-- ── Footnote section ── -->
<section class="teaser-section">

	<div class="footnote">
		<div class="fn-resources-wrap">
			<button
				class="fn-link fn-resources-btn"
				onclick={() => resourcesOpen = !resourcesOpen}
				aria-expanded={resourcesOpen}
			>
				resources
				<svg class="fn-chevron" class:fn-chevron--open={resourcesOpen} width="8" height="8" viewBox="0 0 8 8" fill="none">
					<path d="M1 5.5L4 2.5L7 5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			{#if resourcesOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<div class="fn-resources-backdrop" onclick={() => resourcesOpen = false}></div>
				<nav class="fn-resources-panel" aria-label="Resources">
					<a href="/help" class="fn-resources-item">Help center</a>
					<a href="/roadmap" class="fn-resources-item">Platform roadmap</a>
					<a href="/coop-roadmap" class="fn-resources-item">Co-op roadmap</a>
					<a href="/coop-docs" class="fn-resources-item">Co-op docs</a>
					<a href="/changelog" class="fn-resources-item">Changelog</a>
				</nav>
			{/if}
		</div>
		<span class="fn-sep">·</span>
		<a href="/steward-ownership" class="fn-link">steward ownership</a>
		<span class="fn-sep">·</span>
		<a href="/governance" class="fn-link">participatory governance</a>
		<span class="fn-sep">·</span>
		<a href="/community-care" class="fn-link">community care</a>
		<span class="fn-sep">·</span>
		<span class="fn-text">currently in beta in berlin</span>
	</div>
	<div class="fn-legal">
		<a href="/impressum" class="fn-legal-link">terms of use</a>
		<span class="fn-legal-sep">·</span>
		<a href="/datenschutz" class="fn-legal-link">privacy policy</a>
	</div>
</section>

<style>
	/* ── Orbit section — full screen, no overflow clipping ── */
	.orbit-section {
		position: relative;
		height: 100vh;
		height: 100svh;
		background: #06060a;
	}

	.card-thumb {
		position: absolute;
		left: 0;
		top: 0;
		width: 72px;
		height: 84px;
		border-radius: 14px;
		overflow: hidden;
		cursor: pointer;
		will-change: transform, opacity;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		transition: box-shadow 0.15s;
	}

	.thumb-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		pointer-events: none;
	}

	.thumb-gradient {
		width: 100%;
		height: 100%;
	}

	.arch-pip {
		position: absolute;
		bottom: 6px;
		right: 7px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.55);
	}

	/* ── Center content ── */
	.orbit-center {
		position: absolute;
		top: 46%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		z-index: 30;
		width: 220px;
		pointer-events: none;
	}

	.orbit-center .cta-row,
	.orbit-center .orbit-hint {
		pointer-events: auto;
	}

	.tagline {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.78rem;
		font-weight: 500;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 16px;
		letter-spacing: -0.02em;
	}

	.cta-row {
		display: flex;
		gap: 24px;
		align-items: baseline;
		justify-content: center;
		margin-bottom: 20px;
	}

	.cta {
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.68rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.35);
		padding: 0;
		text-decoration: none;
		letter-spacing: 0.04em;
		-webkit-tap-highlight-color: transparent;
	}

	.cta-primary {
		color: rgba(255, 255, 255, 0.7);
	}

	.orbit-hint {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.2);
		margin: 0;
	}

	.orbit-hint-below {
		position: absolute;
		bottom: 22px;
		left: 0;
		right: 0;
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.2);
		text-align: center;
		margin: 0;
		pointer-events: none;
		z-index: 30;
	}

	/* ── Slide-up preview panel ── */
	.preview-panel {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 200;
		height: 48vh;
		background: rgba(8, 8, 12, 0.97);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 18px 18px 0 0;
		transform: translateY(100%);
		transition: transform 0.52s cubic-bezier(0.32, 0.72, 0, 1);
		backdrop-filter: blur(20px);
	}

	.preview-panel--open {
		transform: translateY(0);
	}

	.preview-inner {
		position: relative;
		padding: 32px 28px 28px;
		height: 100%;
		box-sizing: border-box;
		overflow-y: auto;
	}

	.teaser-close {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		color: rgba(255, 255, 255, 0.4);
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		-webkit-tap-highlight-color: transparent;
	}

	/* ── Footnote section ── */
	.teaser-section {
		background: #06060a;
		padding: 0 24px 60px;
	}

	.teaser-badge {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.28);
		margin: 0 0 10px;
	}

	.teaser-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.15rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 12px;
		line-height: 1.3;
		padding-right: 36px;
	}

	.teaser-snippet {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.85rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.45);
		margin: 0 0 12px;
		line-height: 1.7;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.teaser-author {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.24);
		margin: 0 0 20px;
	}

	.teaser-cta {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.16);
		color: rgba(255, 255, 255, 0.55);
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		padding: 9px 20px;
		border-radius: 100px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.teaser-cta:active {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}

	/* ── Footnote ── */
	.footnote {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		padding-top: 32px;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.fn-link,
	.fn-text {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.22);
		letter-spacing: 0.06em;
		text-decoration: none;
		white-space: nowrap;
	}

	.fn-link {
		color: rgba(255, 255, 255, 0.4);
	}

	.fn-sep {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.1);
		padding: 0 7px;
	}

	/* Resources trigger */
	.fn-resources-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.fn-resources-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.fn-chevron {
		color: rgba(255, 255, 255, 0.18);
		transition: transform 0.18s ease;
	}
	.fn-chevron--open {
		transform: rotate(180deg);
		color: rgba(255, 255, 255, 0.45);
	}

	.fn-resources-backdrop {
		position: fixed;
		inset: 0;
		z-index: 390;
	}

	.fn-resources-panel {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 410;
		background: rgba(12, 12, 16, 0.95);
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

	.fn-resources-item {
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
	.fn-resources-item:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.85);
	}

	/* Legal bar */
	.fn-legal {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 12px;
		padding-bottom: 20px;
	}

	.fn-legal-link {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.52rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.12);
		text-decoration: none;
		transition: color 0.15s;
	}
	.fn-legal-link:hover { color: rgba(255, 255, 255, 0.4); }

	.fn-legal-sep {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.52rem;
		color: rgba(255, 255, 255, 0.07);
		padding: 0 8px;
	}
</style>
