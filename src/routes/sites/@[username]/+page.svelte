<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>@{data.user.username}'s Site - dyad.berlin</title>
	<meta name="description" content="Explore published canvases by @{data.user.username}" />
</svelte:head>

<div class="site-landing">
	<header class="site-header">
		<h1>@{data.user.username}</h1>
	</header>

	<main class="site-content">
		{#if data.canvases.length === 0}
			<p class="empty-state">No published canvases yet.</p>
		{:else}
			<nav class="canvas-list">
				{#each data.canvases as canvas}
					<a href="/sites/@{data.user.username}/{canvas.slug}" class="canvas-card">
						<h2>{canvas.name}</h2>
						<span class="canvas-meta">
							Last updated: {new Date(canvas.updatedAt).toLocaleDateString()}
						</span>
					</a>
				{/each}
			</nav>
		{/if}
	</main>
</div>

<style>
	.site-landing {
		min-height: 100vh;
		background: var(--bg-canvas);
		color: var(--text-primary);
		font-family: 'Georgia', serif;
	}

	.site-header {
		padding: 48px 32px;
		border-bottom: 1px solid var(--border-link);
	}

	.site-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: normal;
	}

	.site-content {
		padding: 32px;
		max-width: 800px;
	}

	.empty-state {
		color: var(--text-muted);
		font-style: italic;
	}

	.canvas-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.canvas-card {
		display: block;
		padding: 24px;
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.2s, background 0.2s;
	}

	.canvas-card:hover {
		border-color: var(--border-link-hover);
		background: var(--bg-control-hover);
	}

	.canvas-card h2 {
		margin: 0 0 8px;
		font-size: 1.25rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.canvas-meta {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
</style>
