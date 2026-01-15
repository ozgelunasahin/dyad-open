<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { Vault } from '$lib/types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import Canvas from '$lib/components/Canvas.svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await fetch('/vault/index.json');
			if (!response.ok) {
				throw new Error('Failed to load vault');
			}
			const vault: Vault = await response.json();

			// If canvas has an entry point, use it
			if (data.canvas.entryPointNoteId) {
				vault.entryPoint = data.canvas.entryPointNoteId;
			}

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
	}
</script>

<svelte:head>
	<title>{data.canvas.name} by @{data.author.username} - dyad.berlin</title>
	<meta name="description" content="A spatial reading canvas by @{data.author.username}" />
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

		<!-- Header with canvas info -->
		<header class="canvas-header">
			<div class="canvas-info">
				<h1>{data.canvas.name}</h1>
				<span class="author">by <a href="/{data.author.username}">@{data.author.username}</a></span>
			</div>
			<span class="read-only-badge">Read-only</span>
		</header>

		<!-- Minimal navigation -->
		<nav class="controls" class:can-navigate={canvasStore.canGoBack || canvasStore.canGoForward}>
			<button
				class="nav-btn"
				onclick={() => canvasStore.goBack()}
				disabled={!canvasStore.canGoBack}
				aria-label="Go back"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M10 12L6 8L10 4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			<button
				class="nav-btn"
				onclick={() => canvasStore.goForward()}
				disabled={!canvasStore.canGoForward}
				aria-label="Go forward"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M6 4L10 8L6 12"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		</nav>

		<!-- Theme toggle -->
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

		<!-- CTA for non-logged-in users -->
		<a href="/register" class="cta-link">Create your own canvas</a>
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

	/* Canvas header */
	.canvas-header {
		position: fixed;
		top: 16px;
		left: 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		z-index: 100;
		background: var(--bg-canvas);
		padding: 10px 14px;
		border-radius: 6px;
		border: 1px solid var(--border-link);
		opacity: 0.9;
		transition: opacity 0.2s;
	}

	.canvas-header:hover {
		opacity: 1;
	}

	.canvas-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.canvas-header h1 {
		margin: 0;
		font-size: 1rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.author {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.author a {
		color: var(--text-link);
		text-decoration: none;
	}

	.author a:hover {
		color: var(--text-link-hover);
	}

	.read-only-badge {
		background: var(--bg-control);
		color: var(--text-muted);
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.75rem;
	}

	/* Navigation controls */
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
		background: var(--bg-control);
		cursor: pointer;
		color: var(--control-color);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--bg-control-hover);
		color: var(--control-color-hover);
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.theme-toggle {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: var(--bg-control);
		cursor: pointer;
		color: var(--control-color);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		opacity: 0.4;
		z-index: 100;
	}

	.theme-toggle:hover {
		background: var(--bg-control-hover);
		color: var(--control-color-hover);
		opacity: 1;
	}

	.cta-link {
		position: fixed;
		bottom: 24px;
		right: 70px;
		padding: 8px 14px;
		background: var(--bg-control);
		border-radius: 4px;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.85rem;
		opacity: 0.6;
		transition: opacity 0.2s, color 0.2s;
		z-index: 100;
	}

	.cta-link:hover {
		opacity: 1;
		color: var(--text-secondary);
	}
</style>
