<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import WebsiteContainer from '$lib/components/WebsiteContainer.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { data }: { data: PageData } = $props();

	let currentSection = $state<string | undefined>(undefined);
	let iframeLoading = $state(true);

	// Initialize canvas for site mode
	onMount(() => {
		if (data.mode === 'site' && data.vault) {
			canvasStore.initialize(data.vault, 'site-landing', data.savedPositions);
		}
	});

	function handleNavigate(slug: string, cardId?: string) {
		if (cardId) {
			canvasStore.navigateToCard(cardId);
			currentSection = slug;
		}
	}

	// For backward compat canvas mode
	let baseUrl = $derived(
		data.mode === 'site' && data.site
			? `/sites/@${data.author.username}/${data.site.slug}`
			: undefined
	);

	let title = $derived(
		data.mode === 'site' && data.site
			? `${data.site.name} by @${data.author.username}`
			: `${data.canvas.name} by @${data.author.username}`
	);

	$effect(() => {
		if (data.mode === 'canvas') {
			data.canvasUrl;
			iframeLoading = true;
		}
	});

	function handleIframeLoad() {
		iframeLoading = false;
	}
</script>

<svelte:head>
	<title>{title} - dyad.berlin</title>
	<meta name="description" content="A reading canvas by @{data.author.username}" />
</svelte:head>

{#if data.mode === 'site'}
	<WebsiteContainer
		author={data.author.username}
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
	<WebsiteContainer
		author={data.author.username}
		canvases={data.siteCanvases}
		currentCanvas={data.canvas.slug}
		{baseUrl}
	>
		<div class="iframe-wrapper">
			{#if iframeLoading}
				<div class="iframe-loading" out:fade={{ duration: 200 }}></div>
			{/if}
			<iframe
				src={data.canvasUrl}
				title={data.canvas.name}
				class="canvas-iframe"
				onload={handleIframeLoad}
			></iframe>
		</div>
	</WebsiteContainer>
{/if}

<style>
	.iframe-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.iframe-loading {
		position: absolute;
		inset: 0;
		background: var(--bg-canvas, #faf9f6);
		z-index: 1;
	}

	.canvas-iframe {
		width: 100%;
		height: 100%;
		border: none;
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
</style>
