<script lang="ts">
	import CanvasSelector from '$lib/components/CanvasSelector.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let canvases = $state(data.canvases);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let lastSaved = $state<string | null>(null);
	let selectedCanvasId = $state<string | null>(null);

	// Get included canvases sorted by position
	let includedCanvases = $derived(
		canvases
			.filter((c) => c.included)
			.sort((a, b) => a.position - b.position)
	);

	// Auto-select first canvas if nothing selected or selection became invalid
	$effect(() => {
		if (includedCanvases.length > 0) {
			const isValidSelection = includedCanvases.some((c) => c.id === selectedCanvasId);
			if (!isValidSelection) {
				selectedCanvasId = includedCanvases[0].id;
			}
		} else {
			selectedCanvasId = null;
		}
	});

	let previewCanvas = $derived(includedCanvases.find((c) => c.id === selectedCanvasId));

	let previewUrl = $derived(
		previewCanvas ? `/@${data.username}/${previewCanvas.slug}` : null
	);

	async function saveCanvases() {
		saving = true;
		error = null;

		try {
			const includedIds = canvases
				.filter((c) => c.included)
				.sort((a, b) => a.position - b.position)
				.map((c) => c.id);

			const res = await fetch(`/api/sites/${data.site.id}/canvases`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(includedIds)
			});

			if (!res.ok) {
				const result = await res.json();
				error = result.error || 'Failed to save';
				return;
			}

			lastSaved = new Date().toLocaleTimeString();
		} catch (e) {
			error = 'Failed to save';
		} finally {
			saving = false;
		}
	}

	function handleCanvasUpdate(updated: typeof canvases) {
		canvases = updated;
		// Auto-save on change
		saveCanvases();
	}

	async function togglePublish() {
		const newState = !data.site.is_published;

		// Check if we have canvases when publishing
		if (newState && !canvases.some((c) => c.included)) {
			error = 'Add at least one canvas before publishing';
			return;
		}

		try {
			const res = await fetch(`/api/sites/${data.site.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_published: newState })
			});

			if (!res.ok) {
				const result = await res.json();
				error = result.error || 'Failed to update';
				return;
			}

			// Redirect to the published site or back to edit
			if (newState) {
				window.location.href = `/sites/@${data.username}/${data.site.slug}`;
			} else {
				window.location.reload();
			}
		} catch (e) {
			error = 'Failed to update';
		}
	}
</script>

<svelte:head>
	<title>Edit {data.site.name} - dyad.berlin</title>
</svelte:head>

<div class="editor">
	<header class="editor-header">
		<div class="header-left">
			<a href="/sites" class="back-link">&larr; Sites</a>
			<h1>{data.site.name}</h1>
			{#if data.site.is_published}
				<span class="published-badge">Published</span>
			{:else}
				<span class="draft-badge">Draft</span>
			{/if}
		</div>
		<div class="header-right">
			{#if lastSaved}
				<span class="save-status">Saved {lastSaved}</span>
			{/if}
			{#if saving}
				<span class="save-status">Saving...</span>
			{/if}
			<a href="/sites/{data.site.slug}/preview" class="action-btn">Preview</a>
			<button class="action-btn publish-btn" onclick={togglePublish}>
				{data.site.is_published ? 'Unpublish' : 'Publish'}
			</button>
		</div>
	</header>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<div class="editor-content">
		<aside class="sidebar">
			<CanvasSelector
				{canvases}
				onUpdate={handleCanvasUpdate}
				selectedId={selectedCanvasId}
				onSelect={(id) => (selectedCanvasId = id)}
			/>
		</aside>

		<main class="preview-area">
			{#if previewUrl && previewCanvas}
				<div class="preview-header">
					<span class="preview-label">Editing: {previewCanvas.name}</span>
					<a href="/@{data.username}/{previewCanvas.slug}" target="_blank" class="open-link">
						Open in new tab &rarr;
					</a>
				</div>
				{#key previewCanvas.id}
					<iframe
						src={previewUrl}
						title="Canvas preview"
						class="preview-iframe"
					></iframe>
				{/key}
			{:else}
				<div class="no-preview">
					<p>Select canvases to preview your site</p>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.editor {
		min-height: 100vh;
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		border-bottom: 1px solid var(--border-link);
		background: var(--bg-canvas);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-link {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.95rem;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--text-link-hover);
	}

	.editor-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.published-badge {
		background: rgba(40, 167, 69, 0.15);
		color: #28a745;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.draft-badge {
		background: var(--bg-control);
		color: var(--text-muted);
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.save-status {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.action-btn {
		padding: 0.5rem 1rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: border-color 0.2s, color 0.2s;
	}

	.action-btn:hover {
		border-color: var(--border-link-hover);
		color: var(--text-primary);
	}

	.publish-btn {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
	}

	.publish-btn:hover {
		opacity: 0.9;
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin: 0;
	}

	.editor-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		width: 350px;
		flex-shrink: 0;
		padding: 1.5rem;
		border-right: 1px solid var(--border-link);
		overflow-y: auto;
		background: var(--bg-control);
	}

	.preview-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--bg-control);
		border-bottom: 1px solid var(--border-link);
	}

	.preview-label {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.open-link {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s;
	}

	.open-link:hover {
		color: var(--text-link-hover);
	}

	.preview-iframe {
		flex: 1;
		border: none;
		background: white;
	}

	.no-preview {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		font-size: 1.1rem;
	}
</style>
