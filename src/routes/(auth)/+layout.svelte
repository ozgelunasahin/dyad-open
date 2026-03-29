<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<nav class="auth-nav">
	<a href="/" class="logo-link" aria-label="Back to home">
		<img src="/images/logo.png" alt="dyad" class="site-logo" />
	</a>
</nav>

<div class="split-layout">
	<div class="image-half">
		<img src={data.authImage} alt="" />
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
		left: var(--space-6);
		z-index: 100;
		display: flex;
		align-items: center;
		height: 48px;
	}

	.logo-link {
		display: flex;
		align-items: center;
	}

	.site-logo {
		height: 34px;
		width: auto;
		filter: brightness(0) invert(1) opacity(0.9);
		transition: filter 0.2s ease;
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

	/* Form — right half, vertically centered */
	.form-half {
		width: 50%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		box-sizing: border-box;
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
