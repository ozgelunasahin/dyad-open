<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { PageData } from './$types';
	import RotatingHeadline from '$lib/components/RotatingHeadline.svelte';
	import ConversationCard from '$lib/components/ConversationCard.svelte';

	let { data }: { data: PageData } = $props();
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
			<a href="/login" class="login-link">log in</a>
		</div>

		<div class="hero-content">
			<RotatingHeadline />

			<p class="tagline">cultivating a culture<br />of conversation</p>

			<div class="city-row">
				<span class="city-dot" aria-hidden="true"></span>
				<span class="city-name">BERLIN</span>
			</div>

			<a href="/waitlist" class="join-btn">
				join waitlist <span class="arrow" aria-hidden="true">→</span>
			</a>
		</div>

		<div class="left-footer">
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
		</div>
	</div>

	<!-- Right: scrollable conversation cards -->
	<div class="right-col">
		<div class="cards-scroll">
			{#if data.prompts && data.prompts.length > 0}
				{#each data.prompts as prompt}
					<ConversationCard {prompt} onclick={() => window.location.href = '/waitlist'} />
				{/each}
			{:else}
				<p class="empty-state">No conversations yet. Check back soon.</p>
			{/if}
		</div>
	</div>
</div>

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

	.logo {
		height: 28px;
		width: auto;
		filter: brightness(0) opacity(0.4);
	}
	:global([data-theme='dark']) .logo { filter: none; }

	.login-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		text-transform: lowercase;
		color: var(--text-muted);
	}
	.login-link:hover { color: var(--text-primary); }

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
		transition: opacity 0.15s;
	}
	.join-btn:hover { opacity: 0.82; }
	.arrow { font-size: var(--text-sm); }

	/* ── Left footer ──────────────────────────────────────────── */
	.left-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: var(--space-6);
		flex-shrink: 0;
	}

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
		font-size: 10px;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}
	.legal-link:hover { color: var(--text-primary); }
	.legal-sep { color: var(--text-muted); font-size: 10px; }

	/* ── Right column ─────────────────────────────────────────── */
	.right-col {
		height: 100vh;
		overflow-y: auto;
	}

	.cards-scroll {
		display: flex;
		flex-direction: column;
	}

	.empty-state {
		padding: var(--space-10);
		text-align: center;
		color: var(--text-muted);
	}

	/* ── Mobile ───────────────────────────────────────────────── */
	@media (max-width: 430px) {
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

		.right-col {
			height: auto;
			overflow: visible;
		}
	}
</style>
