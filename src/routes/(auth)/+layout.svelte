<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Login keeps the moss-dark theme (signup and join are light/paper like
	// the rest of the app) — a deliberate exception, not the section default.
	const isDarkAuth = $derived($page.url.pathname.startsWith('/login'));
</script>

<nav class="auth-nav">
	<a href="/" class="wordmark" aria-label="DYAD">DYAD</a>
</nav>

<div class="split-layout" data-theme={isDarkAuth ? 'dark' : undefined}>
	<div class="image-half">
		<img src={data.authImage} alt="" />
		{#if data.authImageCredit}
			<p class="image-credit">{data.authImageCredit}</p>
		{/if}
	</div>
	<div class="form-half">
		{@render children()}
	</div>
</div>

<style>
	/* === Nav / logo — top-left overlaying image === */
	.auth-nav {
		position: fixed;
		top: var(--space-6);
		left: var(--space-10);
		z-index: 100;
		display: flex;
		align-items: center;
		height: 48px;
	}

	/* Same text wordmark treatment as the landing page — the old image logo
	   rendered as a mangled "dy/ad" line-wrap. */
	.wordmark {
		font-family: var(--font-serif);
		font-size: 22px;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		line-height: 1;
		text-shadow: 0 1px 16px rgba(0, 0, 0, 0.7), 0 0 3px rgba(0, 0, 0, 0.5);
	}

	/* === Split layout — mirrors landing page === */
	.split-layout {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: row;
		overflow: hidden;
		background: var(--bg-canvas);
	}

	/* Image — left half with grain overlay */
	.image-half {
		width: 50%;
		height: 100%;
		position: relative;
		padding: var(--space-4) 0 var(--space-4) var(--space-4);
		box-sizing: border-box;
	}

	.image-half img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
		border-radius: var(--radius-card);
	}

	/* Artwork credit — bottom-right corner of the image, above the grain
	   overlay (z-index 1). */
	.image-credit {
		position: absolute;
		right: var(--space-4);
		bottom: var(--space-6);
		z-index: 2;
		margin: 0;
		font-size: var(--text-xs);
		font-style: italic;
		color: rgba(255, 255, 255, 0.75);
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
	}

	.image-half::after {
		content: '';
		position: absolute;
		top: var(--space-4);
		right: 0;
		bottom: var(--space-4);
		left: var(--space-4);
		border-radius: var(--radius-card);
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
		background-size: 128px 128px;
		mix-blend-mode: overlay;
		pointer-events: none;
		z-index: 1;
	}

	/* Form — right half, vertically centered. Scrolls when the form is
	   taller than the viewport; centering comes from
	   the card's auto margins, which collapse to 0 on overflow so the top
	   of the form always stays reachable. */
	.form-half {
		width: 50%;
		height: 100%;
		display: flex;
		justify-content: center;
		overflow-y: auto;
		padding: 2rem;
		box-sizing: border-box;
	}

	.form-half > :global(.auth-card) {
		margin-top: auto;
		margin-bottom: auto;
	}

	/* === Mobile — image on top, form below === */
	@media (max-width: 430px) {
		.split-layout {
			flex-direction: column;
			height: auto;
			min-height: 100vh;
		}

		.image-half {
			width: 100%;
			height: 40vh;
			padding: var(--space-4) var(--space-4) 0 var(--space-4);
		}

		.image-half img {
			border-radius: var(--radius-card);
		}

		.image-half::after {
			top: var(--space-4);
			right: var(--space-4);
			bottom: 0;
			left: var(--space-4);
			border-radius: var(--radius-card);
		}

		.auth-nav {
			left: var(--space-4);
			top: var(--space-4);
		}

		.form-half {
			width: 100%;
			height: auto;
			padding: 2rem 1.5rem;
		}
	}
</style>
