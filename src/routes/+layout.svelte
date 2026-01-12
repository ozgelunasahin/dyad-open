<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children } = $props();

	// Initialize theme on mount
	$effect(() => {
		// Theme store auto-applies on construction
		themeStore.current;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
