<script lang="ts">
	import { onMount } from 'svelte';
	import type { Vault } from '$lib/types';
	import { MAX_CARDS } from '$lib/types';
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
		// Alt + Left Arrow = Go Back
		if (event.altKey && event.key === 'ArrowLeft') {
			event.preventDefault();
			canvasStore.goBack();
		}
		// Alt + Right Arrow = Go Forward
		if (event.altKey && event.key === 'ArrowRight') {
			event.preventDefault();
			canvasStore.goForward();
		}
		// Escape = Reset view
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
			<div class="spinner"></div>
			<p>Loading vault...</p>
		</div>
	{:else if error}
		<div class="error">
			<h1>Error</h1>
			<p>{error}</p>
			<button onclick={() => window.location.reload()}>Retry</button>
		</div>
	{:else}
		<Canvas />

		<!-- Navigation controls -->
		<nav class="controls">
			<button
				class="nav-btn"
				onclick={() => canvasStore.goBack()}
				disabled={!canvasStore.canGoBack}
				title="Go back (Alt+←)"
				aria-label="Go back"
			>
				←
			</button>
			<button
				class="nav-btn"
				onclick={() => canvasStore.goForward()}
				disabled={!canvasStore.canGoForward}
				title="Go forward (Alt+→)"
				aria-label="Go forward"
			>
				→
			</button>
		</nav>

		<!-- Status bar -->
		<footer class="status">
			<span class="card-count" class:warning={canvasStore.isAtLimit}>
				{canvasStore.cardCount} / {MAX_CARDS} cards
			</span>
			<span class="help">
				Drag to pan • Scroll to zoom • Alt+← / → to navigate
			</span>
		</footer>
	{/if}
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			Cantarell,
			sans-serif;
		overflow: hidden;
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
		color: #64748b;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e2e8f0;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error h1 {
		color: #ef4444;
		margin: 0;
	}

	.error button {
		padding: 8px 16px;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
	}

	.error button:hover {
		background: #2563eb;
	}

	.controls {
		position: fixed;
		top: 16px;
		left: 16px;
		display: flex;
		gap: 8px;
		z-index: 100;
	}

	.nav-btn {
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 8px;
		background: white;
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
		cursor: pointer;
		font-size: 18px;
		color: #334155;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.nav-btn:hover:not(:disabled) {
		background: #f1f5f9;
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.status {
		position: fixed;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 24px;
		padding: 8px 16px;
		background: white;
		border-radius: 8px;
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
		font-size: 12px;
		color: #64748b;
		z-index: 100;
	}

	.card-count {
		font-weight: 500;
	}

	.card-count.warning {
		color: #f59e0b;
	}

	.help {
		opacity: 0.7;
	}
</style>
