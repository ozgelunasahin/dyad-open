<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import WebsiteContainer from '$lib/components/WebsiteContainer.svelte';

	let { data }: { data: PageData } = $props();

	let iframeLoading = $state(true);

	// For explicit sites, navigation should stay within the site
	let siteBaseUrl = $derived(`/sites/@${data.author.username}/${data.site.slug}`);

	// Reset loading state when canvas changes (on navigation)
	$effect(() => {
		// Track canvas URL to detect navigation
		data.canvasUrl;
		iframeLoading = true;
	});

	function handleIframeLoad() {
		iframeLoading = false;
	}
</script>

<svelte:head>
	<title>{data.canvas.name} - dyad. cultivating a culture of conversation</title>
	<meta name="description" content="{data.site.name} by @{data.author.username}" />
</svelte:head>

<WebsiteContainer
	author={data.author.username}
	navItems={data.siteCanvases}
	currentItem={data.canvas.slug}
	baseUrl={siteBaseUrl}
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
</style>
