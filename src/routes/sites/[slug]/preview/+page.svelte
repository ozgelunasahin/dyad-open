<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import WebsiteContainer from '$lib/components/WebsiteContainer.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let error = $state<string | null>(null);
	let loading = $state(true);
	let ready = $state(false);

	// Track the current canvas ID for keying
	let currentCanvasId = $derived(data.currentCanvas?.id ?? null);

	// Initialize canvas when data changes
	$effect(() => {
		// Track dependencies
		const vault = data.vault;
		const canvas = data.currentCanvas;
		const positions = data.cardPositions;

		if (!canvas || !vault) {
			loading = false;
			return;
		}

		// Reset states for transition
		loading = true;
		ready = false;

		// Flush any pending saves from previous canvas
		canvasStore.flushPendingPersist();

		// Initialize after a microtask to allow fade out
		Promise.resolve().then(async () => {
			try {
				await canvasStore.initialize(vault, canvas.id, positions);
				loading = false;
				// Small delay before showing to ensure smooth transition
				requestAnimationFrame(() => {
					ready = true;
				});
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
				loading = false;
			}
		});
	});

	onMount(() => {
		return () => {
			canvasStore.flushPendingPersist();
		};
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

	async function publish() {
		if (data.canvases.length === 0) {
			error = 'Add at least one canvas before publishing';
			return;
		}

		try {
			const res = await fetch(`/api/sites/${data.site.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_published: true })
			});

			if (!res.ok) {
				const result = await res.json();
				error = result.error || 'Failed to publish';
				return;
			}

			window.location.href = `/sites/@${data.username}/${data.site.slug}`;
		} catch (e) {
			error = 'Failed to publish';
		}
	}
</script>

<svelte:head>
	<title>Preview: {data.site.name} - dyad.berlin</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="preview-page">
	<div class="preview-banner">
		<span class="preview-label">Preview Mode</span>
		<div class="banner-actions">
			<a href="/sites/{data.site.slug}/edit" class="banner-btn">Back to Edit</a>
			{#if data.site.is_published}
				<a href="/sites/@{data.username}/{data.site.slug}" class="banner-btn published">
					View Published
				</a>
			{:else}
				<button class="banner-btn publish" onclick={publish}>Publish</button>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if data.canvases.length === 0}
		<div class="empty-state">
			<p>No canvases in this site yet.</p>
			<a href="/sites/{data.site.slug}/edit">Add canvases in the editor</a>
		</div>
	{:else}
		<div class="preview-content">
			<WebsiteContainer
				author={data.username}
				canvases={data.canvases}
				currentCanvas={data.currentCanvas?.slug}
				baseUrl="/sites/{data.site.slug}/preview"
			>
				<div class="canvas-wrapper">
					{#if loading || !ready}
						<div class="canvas-loading" out:fade={{ duration: 300 }}></div>
					{/if}
					{#key currentCanvasId}
						{#if ready}
							<div class="canvas-content" in:fade={{ duration: 300, delay: 50 }}>
								<Canvas readOnly={true} />

								<button class="theme-toggle" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
									{#if themeStore.current === 'light'}
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
											<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
											<path
												d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linecap="round"
											/>
										</svg>
									{:else}
										<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
											<path
												d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									{/if}
								</button>
							</div>
						{/if}
					{/key}
				</div>
			</WebsiteContainer>
		</div>
	{/if}
</div>

<style>
	.preview-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.preview-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.5rem;
		background: #fef3cd;
		border-bottom: 1px solid #ffc107;
	}

	.preview-label {
		font-weight: 500;
		color: #856404;
	}

	.banner-actions {
		display: flex;
		gap: 0.75rem;
	}

	.banner-btn {
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.banner-btn:hover {
		opacity: 0.9;
	}

	a.banner-btn {
		background: white;
		border: 1px solid #ccc;
		color: #333;
	}

	button.banner-btn.publish {
		background: #28a745;
		border: none;
		color: white;
	}

	a.banner-btn.published {
		background: #17a2b8;
		border: none;
		color: white;
	}

	.error-banner {
		background: rgba(220, 53, 69, 0.1);
		border-bottom: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 0.5rem 1.5rem;
		font-size: 0.9rem;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		gap: 1rem;
	}

	.empty-state a {
		color: var(--text-link);
	}

	.preview-content {
		flex: 1;
		overflow: hidden;
	}

	.canvas-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.canvas-loading {
		position: absolute;
		inset: 0;
		background: var(--bg-canvas, #faf9f6);
		z-index: 1;
	}

	.canvas-content {
		width: 100%;
		height: 100%;
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
