<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import ExpandableContent from '$lib/components/ExpandableContent.svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let isMobile = $state(false);
	let mobileMenuOpen = $state(false);

	onMount(async () => {
		const mq = window.matchMedia('(max-width: 768px)');
		isMobile = mq.matches;
		const mqHandler = (e: MediaQueryListEvent) => { isMobile = e.matches; };
		mq.addEventListener('change', mqHandler);

		try {
			const vault = { ...data.vault };
			const hash = window.location.hash.slice(1);
			if (hash && vault.notes[hash]) {
				vault.entryPoint = hash;
			}

			if (!isMobile) {
				await canvasStore.initialize(vault, data.canvas.id, data.cardPositions, true);
			}
			loading = false;

			if (!isMobile) {
				// Wait for Canvas component to mount and register its event listeners,
				// then focus the entry note so the view starts at the beginning
				await tick();
				const entryId = vault.entryPoint;
				if (entryId) {
					canvasStore.focusCard(entryId, true);
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			loading = false;
		}

		return () => mq.removeEventListener('change', mqHandler);
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

	// Get the entry note for mobile ExpandableContent view
	let entryNote = $derived(() => {
		const entryId = data.vault?.entryPoint;
		return entryId ? data.vault?.notes?.[entryId] : null;
	});
</script>

<svelte:head>
	<title>{data.canvas.name} - dyad.</title>
	<meta name="description" content="{data.canvas.name} — dyad. cultivating a culture of conversation" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main class="app" class:mobile={isMobile}>
	{#if loading}
		<div class="loading" out:fade={{ duration: 200 }}></div>
	{:else if error}
		<div class="error" in:fade={{ duration: 200 }}>
			<p>{error}</p>
			<button onclick={() => window.location.reload()}>Retry</button>
		</div>
	{:else if isMobile}
		<div class="mobile-reading" in:fade={{ duration: 200 }}>
			<nav class="mobile-nav">
				<a href="/" class="logo-link" aria-label="Back to home">
					<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt="dyad" class="site-logo" />
				</a>
				<button class="menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Menu">
					{#if mobileMenuOpen}
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
					{:else}
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
					{/if}
				</button>
			</nav>
			{#if mobileMenuOpen}
				<div class="mobile-menu">
					<a href="/" onclick={() => mobileMenuOpen = false}>home</a>
					<hr />
					<a href="/#join" onclick={() => mobileMenuOpen = false}>join</a>
					<a href="/login" onclick={() => mobileMenuOpen = false}>log in</a>
				</div>
			{/if}
			{#if entryNote()}
				<ExpandableContent
					content={entryNote().content}
					vault={data.vault}
				/>
			{/if}
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
		</div>
	{:else}
		<div class="canvas-container" in:fade={{ duration: 200 }}>
			<Canvas readOnly={true} />

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
		</div>
	{/if}
</main>

<style>
	.app {
		width: 100vw;
		height: 100vh;
		position: relative;
		overflow: hidden;
	}

	.loading {
		height: 100%;
		background: var(--bg-canvas);
	}

	.canvas-container {
		width: 100%;
		height: 100%;
	}

	/* Mobile reading view — scrollable, same as landing page */
	.mobile-reading {
		padding: 0 20px 80px;
		overflow-y: auto;
		height: 100%;
		box-sizing: border-box;
	}

	.mobile-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 0;
		margin-bottom: 8px;
	}

	.logo-link {
		display: flex;
		align-items: center;
	}

	.site-logo {
		height: 24px;
		width: auto;
		filter: brightness(0);
		transition: filter 0.2s ease;
	}

	:global([data-theme='dark']) .site-logo {
		filter: none;
	}

	.menu-btn {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-primary, #1a1a1a);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.mobile-menu {
		display: flex;
		flex-direction: column;
		background: color-mix(in srgb, var(--bg-canvas, #f5f3f0) 95%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 16px;
		padding: 12px 8px;
		margin-bottom: 16px;
		box-shadow: 0 4px 24px var(--bg-control, rgba(0, 0, 0, 0.1));
	}

	.mobile-menu a {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 16px;
		font-weight: 500;
		color: var(--text-secondary, #333);
		text-decoration: none;
		padding: 12px 16px;
		border-radius: 8px;
		transition: background 0.15s, color 0.15s;
	}

	.mobile-menu a:hover {
		background: var(--bg-control, rgba(0, 0, 0, 0.05));
		color: var(--text-primary, #1a1a1a);
	}

	.mobile-menu hr {
		border: none;
		border-top: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		margin: 4px 16px;
	}

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
