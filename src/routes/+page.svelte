<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
</script>

<svelte:head>
	<title>dyad.berlin - Spatial Reading for Connected Notes</title>
	<meta name="description" content="A spatial reading environment for connected notes" />
</svelte:head>

<main class="landing">
	<nav class="nav">
		<span class="logo">dyad.berlin</span>
		<div class="nav-links">
			<a href="/login">Sign in</a>
			<a href="/register" class="cta">Get Started</a>
		</div>
	</nav>

	<section class="hero">
		<h1>A spatial reading environment for connected notes</h1>
		<p class="subtitle">
			Navigate your knowledge graph on an infinite canvas. Click wikilinks to expand your reading
			context while keeping everything in view.
		</p>
		<div class="cta-buttons">
			<a href="/register" class="primary-btn">Create your canvas</a>
			<a href="/login" class="secondary-btn">Sign in</a>
		</div>
	</section>

	<section class="features">
		<div class="feature">
			<h3>Spatial Navigation</h3>
			<p>Click links to spawn new cards that expand outward, preserving your reading context.</p>
		</div>
		<div class="feature">
			<h3>Infinite Canvas</h3>
			<p>Pan and zoom freely. Your notes exist in space, connected by lines that show relationships.</p>
		</div>
		<div class="feature">
			<h3>Publish and Share</h3>
			<p>Make your canvas public with a single click. Share read-only views with anyone.</p>
		</div>
	</section>

	<footer class="footer">
		<button class="theme-toggle" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
			{#if themeStore.current === 'light'}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
					<path
						d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{/if}
		</button>
	</footer>
</main>

<style>
	.landing {
		min-height: 100vh;
		background: var(--bg-canvas);
		padding: 0;
	}

	.nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		max-width: 1000px;
		margin: 0 auto;
	}

	.logo {
		font-size: 1.25rem;
		color: var(--text-primary);
		font-weight: normal;
	}

	.nav-links {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav-links a {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.95rem;
		transition: color 0.2s;
	}

	.nav-links a:hover {
		color: var(--text-link-hover);
	}

	.nav-links .cta {
		padding: 0.5rem 1rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-radius: 4px;
	}

	.nav-links .cta:hover {
		opacity: 0.9;
		color: var(--bg-canvas);
	}

	.hero {
		max-width: 700px;
		margin: 0 auto;
		padding: 6rem 2rem 4rem;
		text-align: center;
	}

	.hero h1 {
		font-size: 2.5rem;
		font-weight: normal;
		line-height: 1.3;
		margin: 0 0 1.5rem 0;
		color: var(--text-primary);
	}

	.subtitle {
		font-size: 1.15rem;
		line-height: 1.6;
		color: var(--text-muted);
		margin: 0 0 2.5rem 0;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.primary-btn {
		padding: 0.85rem 1.75rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		text-decoration: none;
		border-radius: 4px;
		font-size: 1rem;
		transition: opacity 0.2s;
	}

	.primary-btn:hover {
		opacity: 0.9;
	}

	.secondary-btn {
		padding: 0.85rem 1.75rem;
		background: none;
		border: 1px solid var(--border-link);
		color: var(--text-secondary);
		text-decoration: none;
		border-radius: 4px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.secondary-btn:hover {
		border-color: var(--border-link-hover);
	}

	.features {
		max-width: 900px;
		margin: 0 auto;
		padding: 4rem 2rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 3rem;
	}

	.feature h3 {
		font-size: 1.1rem;
		font-weight: normal;
		margin: 0 0 0.75rem 0;
		color: var(--text-primary);
	}

	.feature p {
		margin: 0;
		color: var(--text-muted);
		line-height: 1.6;
		font-size: 0.95rem;
	}

	.footer {
		padding: 2rem;
		text-align: center;
	}

	.theme-toggle {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: var(--bg-control);
		cursor: pointer;
		color: var(--control-color);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		opacity: 0.4;
	}

	.theme-toggle:hover {
		background: var(--bg-control-hover);
		color: var(--control-color-hover);
		opacity: 1;
	}

	@media (max-width: 600px) {
		.hero h1 {
			font-size: 1.75rem;
		}

		.cta-buttons {
			flex-direction: column;
		}

		.features {
			grid-template-columns: 1fr;
		}
	}
</style>
