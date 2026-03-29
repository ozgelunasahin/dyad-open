<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} - dyad. cultivating a culture of conversation</title>
</svelte:head>

<div class="error-container">
	<div class="error-content">
		<h1>{$page.status}</h1>
		<p class="message">
			{#if $page.status === 404}
				this page doesn't exist.
			{:else if $page.status === 403}
				you don't have permission to view this.
			{:else if $page.status === 500}
				something went wrong. sorry.
			{:else}
				{$page.error?.message || 'An error occurred.'}
			{/if}
		</p>
		<a href="/" class="home-link">Go home</a>
	</div>
</div>

<style>
	.error-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: var(--bg-canvas);
	}

	.error-content {
		text-align: center;
	}

	h1 {
		font-size: 6rem;
		font-weight: 300;
		margin: 0;
		color: var(--text-muted);
		line-height: 1;
	}

	.message {
		font-size: var(--text-xl);
		color: var(--text-secondary);
		margin: var(--space-4) 0 var(--space-8);
	}

	.home-link {
		display: inline-block;
		padding: var(--space-3) var(--space-6);
		color: var(--text-link);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		text-decoration: none;
		transition: border-color 0.2s, color 0.2s;
	}

	.home-link:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
	}
</style>
