<script lang="ts">
	/**
	 * Published Canvas - Read-only view
	 *
	 * Removed UI elements (may re-enable later):
	 * - Canvas header with title, author link, and "Read-only" badge
	 * - Back/forward navigation buttons (bottom-left)
	 * - Theme toggle button (bottom-right)
	 * - "Create your own canvas" CTA link
	 *
	 * See git history for full implementation if needed.
	 */
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import Canvas from '$lib/components/Canvas.svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		// Set theme based on browser/system preference
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

		// Listen for theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleThemeChange = (e: MediaQueryListEvent) => {
			document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
		};
		mediaQuery.addEventListener('change', handleThemeChange);

		try {
			// Use vault from page data (loaded server-side from Supabase)
			await canvasStore.initialize(data.vault, data.canvas.id, data.cardPositions);
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			loading = false;
		}

		return () => {
			mediaQuery.removeEventListener('change', handleThemeChange);
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.altKey && event.key === 'ArrowLeft') {
			event.preventDefault();
			canvasStore.goBack();
		}
		if (event.altKey && event.key === 'ArrowRight') {
			event.preventDefault();
			canvasStore.goForward();
		}
	}
</script>

<svelte:head>
	<title>{data.canvas.name} by @{data.author.username} - dyad.berlin</title>
	<meta name="description" content="A reading canvas by @{data.author.username}" />
	<!-- Prevent caching of potentially private content -->
	<meta http-equiv="Cache-Control" content="no-store" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main class="app">
	{#if loading}
		<div class="loading">
			<p>Loading...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>{error}</p>
			<button onclick={() => window.location.reload()}>Retry</button>
		</div>
	{:else}
		<Canvas readOnly={true} />
	{/if}
</main>

<style>
	.app {
		width: 100vw;
		height: 100vh;
		position: relative;
		overflow: hidden;
	}

	.loading,
	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 16px;
		color: var(--text-muted);
		font-family: 'Georgia', serif;
	}

	.error button {
		padding: 8px 16px;
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--border-link);
		border-radius: 4px;
		cursor: pointer;
		font-family: inherit;
		font-size: 13px;
	}

	.error button:hover {
		border-color: var(--border-link-hover);
		color: var(--text-secondary);
	}
</style>
