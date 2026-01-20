<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import WebsiteContainer from '$lib/components/WebsiteContainer.svelte';

	let { data }: { data: PageData } = $props();

	function handlePageLink(path: string) {
		// Navigate to another canvas in the site
		// Convert canvas path like /@username/slug to site path /sites/@username/slug
		const parts = path.split('/').filter(Boolean);
		if (parts.length >= 2) {
			goto(`/sites/@${parts[0].replace('@', '')}/${parts[1]}`);
		}
	}
</script>

<svelte:head>
	<title>{data.canvas.name} by @{data.author.username} - dyad.berlin</title>
	<meta name="description" content="A reading canvas by @{data.author.username}" />
</svelte:head>

<WebsiteContainer
	title={data.canvas.name}
	author={data.author.username}
	onPageLink={handlePageLink}
	editUrl={data.isAuthor ? `/canvas/${data.canvas.id}` : undefined}
	canvases={data.siteCanvases}
	currentCanvas={data.canvas.slug}
>
	<iframe
		src={data.canvasUrl}
		title={data.canvas.name}
		class="canvas-iframe"
	></iframe>
</WebsiteContainer>

<style>
	.canvas-iframe {
		width: 100%;
		height: 100%;
		border: none;
	}
</style>
