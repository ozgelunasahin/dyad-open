<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import WebsiteContainer from '$lib/components/WebsiteContainer.svelte';
	import Canvas from '$lib/components/Canvas.svelte';

	let { data } = $props();

	let currentSection = $state<string | undefined>(undefined);

	// Initialize once on mount — NOT in $effect (initialize writes reactive state, causing loops)
	onMount(() => {
		if (data.vault) {
			canvasStore.initialize(data.vault, 'site-landing', data.savedPositions);
		}
	});

	function handleNavigate(slug: string) {
		const map = data.entryPointMap as Record<string, string> | undefined;
		const cardId = map?.[slug];
		if (cardId) {
			canvasStore.focusCard(cardId, true);
			currentSection = slug;
		}
	}
</script>

<svelte:head>
	<title>dyad.berlin — social civic infrastructure</title>
	<meta name="description" content="Social civic infrastructure for community bridging in Berlin." />
</svelte:head>

{#if data.vault && Object.keys(data.vault.notes).length > 0}
	<WebsiteContainer
		author={data.author ?? ''}
		navItems={data.navItems}
		currentItem={currentSection}
		onNavigate={handleNavigate}
	>
		<Canvas readOnly />
	</WebsiteContainer>

	<button class="theme-toggle" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
		{#if themeStore.current === 'light'}
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
				<path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		{:else}
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</button>
{:else}
	<!-- Fallback when no site configured -->
	<div class="fallback">
		<h1 class="splash-logo">dyad.berlin</h1>
		<p class="splash-tagline">Social civic infrastructure for Berlin</p>
	</div>
{/if}

<style>
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

	.fallback {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg-canvas);
		color: var(--text-primary);
		padding: 2rem;
		text-align: center;
	}

	.splash-logo {
		font-family: 'Georgia', serif;
		font-size: 2.5rem;
		font-weight: normal;
		margin: 0 0 0.75rem 0;
	}

	.splash-tagline {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin: 0;
	}
</style>
