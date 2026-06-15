<script lang="ts">
	import ConstellationCanvas from '$lib/components/ConstellationCanvas.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Constellation — dyad.</title>
</svelte:head>

<!--
  This page intentionally uses position:fixed to cover the app shell.
  The constellation is a full-screen spatial experience.
-->
<ConstellationCanvas cards={data.cards} />
