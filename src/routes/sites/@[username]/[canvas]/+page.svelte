<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import WebsiteContainer from '$lib/components/WebsiteContainer.svelte';
	import SiteSPA from '$lib/components/SiteSPA.svelte';

	let { data }: { data: PageData } = $props();

	let iframeLoading = $state(true);

	let title = $derived(
		data.mode === 'site' && data.site
			? `${data.site.name} by @${data.author.username}`
			: `${data.canvas.name} by @${data.author.username}`
	);

	// --- Canvas mode (backward compat) ---
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
	<SiteSPA
		sections={data.sections}
		navItems={data.navItems}
		siteName={data.site.name}
		fullHeight
	/>
{:else}
	<!-- Backward compat: single canvas mode -->
	<WebsiteContainer
		author={data.author.username}
		canvases={data.siteCanvases}
		currentCanvas={data.canvas.slug}
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
	/* === Backward compat (canvas mode) === */
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
</style>
