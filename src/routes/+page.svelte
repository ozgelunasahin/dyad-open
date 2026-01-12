<script lang="ts">
	import { onMount } from 'svelte';
	import type { Vault } from '$lib/types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import Canvas from '$lib/components/Canvas.svelte';

	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await fetch('/vault/index.json');
			if (!response.ok) {
				throw new Error('Failed to load vault');
			}
			const vault: Vault = await response.json();
			await canvasStore.initialize(vault);
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			loading = false;
		}
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
		if (event.key === 'Escape') {
			canvasStore.reset();
		}
	}
</script>

<svelte:head>
	<title>Spatial Reader</title>
	<meta name="description" content="A spatial reading environment for connected notes" />
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
		<Canvas />

		<!-- Minimal navigation (hidden by default, shows on hover) -->
		<nav class="controls" class:can-navigate={canvasStore.canGoBack || canvasStore.canGoForward}>
			<button
				class="nav-btn"
				onclick={() => canvasStore.goBack()}
				disabled={!canvasStore.canGoBack}
				aria-label="Go back"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			<button
				class="nav-btn"
				onclick={() => canvasStore.goForward()}
				disabled={!canvasStore.canGoForward}
				aria-label="Go forward"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		</nav>
	{/if}
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Georgia', 'Times New Roman', serif;
		overflow: hidden;
		background: #1a1a1a;
	}

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
		color: #666;
		font-family: 'Georgia', serif;
	}

	.error button {
		padding: 8px 16px;
		background: transparent;
		color: #888;
		border: 1px solid #444;
		border-radius: 4px;
		cursor: pointer;
		font-family: inherit;
		font-size: 13px;
	}

	.error button:hover {
		border-color: #666;
		color: #aaa;
	}

	.controls {
		position: fixed;
		bottom: 24px;
		left: 24px;
		display: flex;
		gap: 4px;
		opacity: 0;
		transition: opacity 0.3s ease;
		z-index: 100;
	}

	.controls:hover,
	.controls.can-navigate {
		opacity: 1;
	}

	.app:hover .controls.can-navigate {
		opacity: 0.6;
	}

	.app:hover .controls.can-navigate:hover {
		opacity: 1;
	}

	.nav-btn {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
		color: rgba(255, 255, 255, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.nav-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
