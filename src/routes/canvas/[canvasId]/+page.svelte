<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { dev } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import HelpBar from '$lib/components/HelpBar.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let showSettingsPanel = $state(false);
	let showCreateNoteModal = $state(false);
	let renaming = $state(false);
	let creatingNote = $state(false);
	let newNoteName = $state('');
	let showHelp = $state(false);

	async function createOrphanNote() {
		if (!newNoteName.trim()) return;

		creatingNote = true;
		const wasEmpty = Object.keys(data.vault.notes).length === 0;

		// Generate slug from name
		const slug = newNoteName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		if (!slug) {
			creatingNote = false;
			return;
		}

		// Create JSON content for new note
		const content = {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: newNoteName }]
				},
				{ type: 'paragraph' }
			]
		};

		try {
			// Create the note via API with JSON content
			const response = await fetch(`/api/notes/${slug}?canvas_id=${data.canvas.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: newNoteName, content })
			});

			if (!response.ok) {
				throw new Error('Failed to create note');
			}

			// If this was the first note, reload to properly initialize the canvas
			if (wasEmpty) {
				window.location.href = `/canvas/${data.canvas.id}?edit=${slug}`;
				return;
			}

			// Create orphan card in the canvas store
			await canvasStore.createOrphanCard(slug, newNoteName);

			// Reset state
			newNoteName = '';
			showCreateNoteModal = false;

			// Enter edit mode after card animation completes
			setTimeout(() => {
				canvasStore.enterEditMode(slug);
			}, 500);
		} catch (err) {
			console.error('Failed to create orphan note:', err);
		} finally {
			creatingNote = false;
		}
	}

	onMount(async () => {
		try {
			console.log('[Canvas] Initializing with vault from page data...');
			console.log('[Canvas] Notes count:', Object.keys(data.vault.notes).length);

			// Pass canvasId and saved positions for per-canvas state persistence
			await canvasStore.initialize(data.vault, data.canvas.id, data.cardPositions);
			console.log('[Canvas] Store initialized');
			loading = false;

			// Check for ?edit= query param (used after first note creation)
			const editSlug = $page.url.searchParams.get('edit');
			if (editSlug && data.vault.notes[editSlug]) {
				// Clear the query param from URL
				goto(`/canvas/${data.canvas.id}`, { replaceState: true });
				// Enter edit mode after a short delay for card to render
				setTimeout(() => {
					canvasStore.enterEditMode(editSlug);
				}, 100);
			}
		} catch (e) {
			console.error('[Canvas] Error:', e);
			error = e instanceof Error ? e.message : 'Unknown error';
			loading = false;
		}
	});

	function handleKeydown(event: KeyboardEvent) {
		// Don't trigger shortcuts if typing in an input or editing a card
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
		if (canvasStore.editingCardId) return;

		if (event.altKey && event.key === 'ArrowLeft') {
			event.preventDefault();
			canvasStore.goBack();
		}
		if (event.altKey && event.key === 'ArrowRight') {
			event.preventDefault();
			canvasStore.goForward();
		}
		// Toggle help bar with ?
		if (event.key === '?' || (event.shiftKey && event.key === '/')) {
			event.preventDefault();
			showHelp = !showHelp;
		}
		// Toggle debug mode with Ctrl+Shift+D (dev only)
		if (dev && event.ctrlKey && event.shiftKey && event.key === 'D') {
			event.preventDefault();
			canvasStore.toggleDebugMode();
		}
	}

	function copyPublicUrl() {
		const url = `${window.location.origin}/canvas/${data.canvas.id}`;
		navigator.clipboard.writeText(url);
	}
</script>

<svelte:head>
	<title>{data.canvas.name} - dyad.berlin</title>
	<meta name="description" content="A reading environment for connected notes" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main class="app">
	{#if loading}
		<div class="loading">
			<p>Loading...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>{error}</p>
			<button onclick={() => window.location.reload()}>Retry</button>
		</div>
	{:else if Object.keys(data.vault.notes).length === 0}
		<!-- Empty canvas state -->
		<div class="empty-canvas">
			<h2>Your canvas is empty</h2>
			<p>Create your first note to get started.</p>
			<button class="create-first-note-btn" onclick={() => (showCreateNoteModal = true)}>
				Create Note
			</button>
		</div>

		<!-- Header with canvas info (simplified for empty state) -->
		<header class="canvas-header">
			<a href="/dashboard" class="back-link">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M10 12L6 8L10 4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
			<h1>{data.canvas.name}</h1>
		</header>

		<!-- Create Note Modal for empty state -->
		{#if showCreateNoteModal}
			<div class="modal-overlay" onclick={() => (showCreateNoteModal = false)}>
				<div class="modal" onclick={(e) => e.stopPropagation()}>
					<h2>Create Your First Note</h2>
					<p class="modal-description">
						Give your note a title. You can add content and links after creating it.
					</p>
					<form
						onsubmit={(e) => {
							e.preventDefault();
							createOrphanNote();
						}}
					>
						<input
							type="text"
							id="noteName"
							bind:value={newNoteName}
							required
							maxlength="100"
							placeholder="Note title"
							disabled={creatingNote}
							autofocus
						/>
						<div class="modal-actions">
							<button
								type="button"
								class="cancel-btn"
								onclick={() => (showCreateNoteModal = false)}
							>
								Cancel
							</button>
							<button type="submit" class="submit-btn" disabled={creatingNote || !newNoteName.trim()}>
								{creatingNote ? 'Creating...' : 'Create Note'}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	{:else}
		<Canvas />

		<!-- Header with canvas info -->
		<header class="canvas-header">
			<a href="/dashboard" class="back-link">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M10 12L6 8L10 4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
			<h1>{data.canvas.name}</h1>
			<button
				class="new-note-btn"
				onclick={() => (showCreateNoteModal = true)}
				title="Create new orphan note"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</button>
			<button class="settings-btn" onclick={() => (showSettingsPanel = !showSettingsPanel)}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" />
					<path
						d="M13.5 8c0-.3-.2-.6-.5-.7l-.9-.3c-.1-.3-.2-.6-.4-.9l.4-.8c.1-.3 0-.6-.2-.8l-.7-.7c-.2-.2-.5-.3-.8-.2l-.8.4c-.3-.2-.6-.3-.9-.4l-.3-.9c-.1-.3-.4-.5-.7-.5h-1c-.3 0-.6.2-.7.5l-.3.9c-.3.1-.6.2-.9.4l-.8-.4c-.3-.1-.6 0-.8.2l-.7.7c-.2.2-.3.5-.2.8l.4.8c-.2.3-.3.6-.4.9l-.9.3c-.3.1-.5.4-.5.7v1c0 .3.2.6.5.7l.9.3c.1.3.2.6.4.9l-.4.8c-.1.3 0 .6.2.8l.7.7c.2.2.5.3.8.2l.8-.4c.3.2.6.3.9.4l.3.9c.1.3.4.5.7.5h1c.3 0 .6-.2.7-.5l.3-.9c.3-.1.6-.2.9-.4l.8.4c.3.1.6 0 .8-.2l.7-.7c.2-.2.3-.5.2-.8l-.4-.8c.2-.3.3-.6.4-.9l.9-.3c.3-.1.5-.4.5-.7v-1z"
						stroke="currentColor"
						stroke-width="1.5"
					/>
				</svg>
			</button>
		</header>

		<!-- Settings Panel -->
		{#if showSettingsPanel}
			<div class="settings-panel">
				<h2>Canvas Settings</h2>

				{#if form?.error}
					<div class="error-message">{form.error}</div>
				{/if}

				<div class="setting-group">
					<label>Canvas Name</label>
					<form
						method="POST"
						action="?/rename"
						use:enhance={() => {
							renaming = true;
							return async ({ update }) => {
								renaming = false;
								await update();
							};
						}}
					>
						<div class="input-row">
							<input
								type="text"
								name="name"
								value={data.canvas.name}
								disabled={renaming}
								maxlength="100"
							/>
							<button type="submit" class="save-btn" disabled={renaming}>
								{renaming ? '...' : 'Save'}
							</button>
						</div>
					</form>
				</div>

				<div class="setting-group">
					<label>Public URL</label>
					<div class="url-display">
						<code>/{data.canvas.slug}</code>
						{#if data.canvas.is_published}
							<button class="copy-btn" onclick={copyPublicUrl}>Copy</button>
						{/if}
					</div>
				</div>

				<div class="setting-group">
					<label>Publishing</label>
					<form method="POST" action="?/togglePublish" use:enhance>
						<div class="toggle-row">
							<span class="status">{data.canvas.is_published ? 'Published' : 'Private'}</span>
							<button type="submit" class="toggle-btn">
								{data.canvas.is_published ? 'Unpublish' : 'Publish'}
							</button>
						</div>
					</form>
					{#if data.canvas.is_published}
						<p class="hint">Anyone with the link can view this canvas (read-only).</p>
					{:else}
						<p class="hint">Only you can view this canvas.</p>
					{/if}
				</div>

				<button class="close-btn" onclick={() => (showSettingsPanel = false)}>Close</button>
			</div>
		{/if}

		<!-- Create Note Modal -->
		{#if showCreateNoteModal}
			<div class="modal-overlay" onclick={() => (showCreateNoteModal = false)}>
				<div class="modal" onclick={(e) => e.stopPropagation()}>
					<h2>Create New Note</h2>
					<p class="modal-description">
						Create an orphan note (not connected to any other card).
					</p>
					<form
						onsubmit={(e) => {
							e.preventDefault();
							createOrphanNote();
						}}
					>
						<input
							type="text"
							id="noteName"
							bind:value={newNoteName}
							required
							maxlength="100"
							placeholder="Note title"
							disabled={creatingNote}
							autofocus
						/>
						<div class="modal-actions">
							<button
								type="button"
								class="cancel-btn"
								onclick={() => (showCreateNoteModal = false)}
							>
								Cancel
							</button>
							<button type="submit" class="submit-btn" disabled={creatingNote || !newNoteName.trim()}>
								{creatingNote ? 'Creating...' : 'Create Note'}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}

		<!-- Debug controls -->
		{#if canvasStore.debugMode}
			<button
				class="debug-btn open-all-btn"
				onclick={() => canvasStore.openAllLinks()}
				aria-label="Open all links"
				title="Open all links (BFS order)"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M2 4h12M2 8h12M2 12h12"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
					<circle cx="13" cy="4" r="1.5" fill="currentColor" />
					<circle cx="13" cy="8" r="1.5" fill="currentColor" />
					<circle cx="13" cy="12" r="1.5" fill="currentColor" />
				</svg>
			</button>

			<button
				class="debug-btn zoom-fit-btn"
				onclick={() => canvasStore.zoomToFit()}
				aria-label="Zoom to fit"
				title="Zoom to fit all cards"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="1.5" rx="1"
					/>
					<path
						d="M5 5L8 8M11 5L8 8M5 11L8 8M11 11L8 8"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>

			<button
				class="debug-btn reset-btn"
				onclick={() => canvasStore.hardReset()}
				aria-label="Hard reset canvas"
				title="Hard reset - clear all cards and positions"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M2 8a6 6 0 1 1 1.5 4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
					<path
						d="M2 12V8h4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{/if}

		<!-- Help bar -->
		<HelpBar visible={showHelp} />

		<!-- Theme toggle -->
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
	{/if}
</main>

<style>
	.app {
		width: 100vw;
		height: 100vh;
		position: relative;
		overflow: hidden;
	}

	.loading,
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

	.empty-canvas {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 16px;
		color: var(--text-muted);
		font-family: 'Georgia', serif;
		text-align: center;
		padding: 24px;
	}

	.empty-canvas h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.empty-canvas p {
		margin: 0;
		font-size: 1rem;
	}

	.create-first-note-btn {
		margin-top: 8px;
		padding: 12px 24px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.create-first-note-btn:hover {
		opacity: 0.9;
	}

	.error button:hover {
		border-color: var(--border-link-hover);
		color: var(--text-secondary);
	}

	/* Canvas header */
	.canvas-header {
		position: fixed;
		top: 16px;
		left: 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		z-index: 100;
		background: var(--bg-canvas);
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid var(--border-link);
		opacity: 0.8;
		transition: opacity 0.2s;
	}

	.canvas-header:hover {
		opacity: 1;
	}

	.canvas-header h1 {
		margin: 0;
		font-size: 1rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.back-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		color: var(--text-muted);
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--text-primary);
	}

	.settings-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.2s;
	}

	.settings-btn:hover {
		color: var(--text-primary);
	}

	.new-note-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.2s;
	}

	.new-note-btn:hover {
		color: var(--text-primary);
	}

	/* Settings panel */
	.settings-panel {
		position: fixed;
		top: 60px;
		left: 16px;
		width: 320px;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		padding: 20px;
		z-index: 200;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.settings-panel h2 {
		margin: 0 0 16px 0;
		font-size: 1.1rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.setting-group {
		margin-bottom: 16px;
	}

	.setting-group label {
		display: block;
		margin-bottom: 6px;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.input-row {
		display: flex;
		gap: 8px;
	}

	.input-row input {
		flex: 1;
		padding: 6px 10px;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	.input-row input:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	.save-btn {
		padding: 6px 12px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
	}

	.save-btn:disabled {
		opacity: 0.6;
	}

	.url-display {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.url-display code {
		flex: 1;
		padding: 6px 10px;
		background: var(--bg-code);
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: monospace;
		color: var(--text-secondary);
	}

	.copy-btn {
		padding: 6px 10px;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.8rem;
		font-family: inherit;
		color: var(--text-muted);
		cursor: pointer;
	}

	.copy-btn:hover {
		border-color: var(--border-link-hover);
		color: var(--text-secondary);
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.status {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.toggle-btn {
		padding: 6px 12px;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.toggle-btn:hover {
		border-color: var(--border-link-hover);
	}

	.hint {
		margin: 8px 0 0 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 8px 12px;
		border-radius: 4px;
		margin-bottom: 16px;
		font-size: 0.85rem;
	}

	.close-btn {
		width: 100%;
		padding: 8px;
		margin-top: 8px;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: inherit;
		color: var(--text-muted);
		cursor: pointer;
	}

	.close-btn:hover {
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

	.debug-btn {
		position: fixed;
		bottom: 24px;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: var(--bg-control);
		cursor: pointer;
		color: #4ade80;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		opacity: 0.8;
		z-index: 100;
	}

	.debug-btn:hover {
		background: var(--bg-control-hover);
		opacity: 1;
	}

	.open-all-btn {
		right: 144px;
	}

	.zoom-fit-btn {
		right: 104px;
	}

	.reset-btn {
		right: 184px;
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 300;
	}

	.modal {
		background: var(--bg-canvas);
		border-radius: 8px;
		padding: 24px;
		width: 100%;
		max-width: 400px;
		margin: 16px;
	}

	.modal h2 {
		margin: 0 0 8px 0;
		font-size: 1.25rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.modal-description {
		margin: 0 0 20px 0;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.modal input[type='text'] {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		margin-bottom: 20px;
	}

	.modal input[type='text']:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	.modal-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.cancel-btn {
		padding: 10px 16px;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
	}

	.cancel-btn:hover {
		border-color: var(--border-link-hover);
	}

	.submit-btn {
		padding: 10px 16px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
