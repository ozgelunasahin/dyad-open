<script lang="ts">
	import '../app.css';
	// favicon.png is in static/ — referenced directly
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children } = $props();

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
	<title>dyad. cultivating a culture of conversation</title>
	<link rel="icon" href="/favicon.png" type="image/png" />
</svelte:head>

{@render children()}
