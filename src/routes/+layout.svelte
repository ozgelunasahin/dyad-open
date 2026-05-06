<script lang="ts">
	import '../app.css';
	// favicon.png is in static/ — referenced directly
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { themeStore } from '$lib/stores/theme.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();

	// Plausible analytics: load on the public + authenticated app, NOT the
	// admin plane. Production admin lives at admin.dyad.berlin; local dev
	// uses path-prefixed /admin/* (and the bare /admin redirect). Disabled
	// when PUBLIC_PLAUSIBLE_DOMAIN is unset. The pathname check uses '/admin'
	// (no trailing slash) to match src/hooks.server.ts and exclude the bare
	// /admin path before its server-side redirect.
	const PLAUSIBLE_DOMAIN = env.PUBLIC_PLAUSIBLE_DOMAIN;
	const PLAUSIBLE_SRC = env.PUBLIC_PLAUSIBLE_SCRIPT_SRC || 'https://plausible.io/js/script.js';
	const plausibleEnabled = $derived(
		!!PLAUSIBLE_DOMAIN
			&& page.url.hostname !== 'admin.dyad.berlin'
			&& !page.url.pathname.startsWith('/admin')
	);

	// Initialize theme on mount
	$effect(() => {
		// Theme store auto-applies on construction
		themeStore.current;
	});

	// Set up global error collector for feedback context
	onMount(() => {
		const MAX_ERRORS = 10;
		(window as any).__recentErrors = (window as any).__recentErrors || [];

		// Capture unhandled errors
		const originalOnError = window.onerror;
		window.onerror = (message, source, line, col, error) => {
			(window as any).__recentErrors.push({
				type: 'error',
				message: String(message),
				source: source?.replace(window.location.origin, ''),
				line,
				col,
				stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
				timestamp: Date.now()
			});
			if ((window as any).__recentErrors.length > MAX_ERRORS) {
				(window as any).__recentErrors.shift();
			}
			if (originalOnError) return originalOnError(message, source, line, col, error);
			return false;
		};

		// Capture unhandled promise rejections
		const handleRejection = (event: PromiseRejectionEvent) => {
			(window as any).__recentErrors.push({
				type: 'unhandledrejection',
				message: String(event.reason?.message || event.reason),
				stack: event.reason?.stack?.split('\n').slice(0, 3).join('\n'),
				timestamp: Date.now()
			});
			if ((window as any).__recentErrors.length > MAX_ERRORS) {
				(window as any).__recentErrors.shift();
			}
		};
		window.addEventListener('unhandledrejection', handleRejection);

		return () => {
			window.removeEventListener('unhandledrejection', handleRejection);
			window.onerror = originalOnError;
		};
	});
</script>

<svelte:head>
	<title>dyad.</title>
	<link rel="icon" href="/favicon.png" type="image/png" />
	{#if plausibleEnabled}
		<script defer data-domain={PLAUSIBLE_DOMAIN} src={PLAUSIBLE_SRC}></script>
	{/if}
</svelte:head>

{@render children()}

<Footer />
