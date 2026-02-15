<script lang="ts">
	/**
	 * Published Canvas - Read-only view with highlighting + comments
	 */
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import CommentSidebar from '$lib/components/CommentSidebar.svelte';
	import HighlightPopover from '$lib/components/HighlightPopover.svelte';
	import MeetingInviteModal from '$lib/components/MeetingInviteModal.svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);

	// Highlight + comment state
	let sidebarOpen = $state(false);
	let highlights = $state(data.highlights ?? []);
	let activeHighlightId = $state<string | null>(null);

	// Text selection popover state
	let showPopover = $state(false);
	let popoverX = $state(0);
	let popoverY = $state(0);
	let pendingSelection = $state<{
		text: string;
		noteSlug: string;
		startOffset: number;
		endOffset: number;
	} | null>(null);

	function toggleTheme() {
		themeStore.toggle();
	}

	onMount(async () => {
		try {
			const hash = window.location.hash.slice(1);
			const vault = { ...data.vault };
			if (hash && vault.notes[hash]) {
				vault.entryPoint = hash;
			}

			await canvasStore.initialize(vault, data.canvas.id, data.cardPositions);
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			loading = false;
		}
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
		if (event.key === 'Escape') {
			showPopover = false;
			if (sidebarOpen) sidebarOpen = false;
		}
	}

	function handleTextSelection() {
		if (!data.currentUserId) return; // Not logged in

		const selection = window.getSelection();
		if (!selection || selection.isCollapsed || !selection.toString().trim()) {
			showPopover = false;
			return;
		}

		const text = selection.toString().trim();
		if (text.length < 3 || text.length > 5000) {
			showPopover = false;
			return;
		}

		// Get the position for the popover
		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		popoverX = rect.left + rect.width / 2;
		popoverY = rect.top;

		// Try to determine which note this is in (from the closest card element)
		const noteCard = range.startContainer.parentElement?.closest('[data-note-id]');
		const noteSlug = noteCard?.getAttribute('data-note-id') ?? canvasStore.focusedCardId ?? '';

		if (!noteSlug) {
			showPopover = false;
			return;
		}

		pendingSelection = {
			text,
			noteSlug,
			startOffset: 0, // Simplified: we store the text verbatim for matching
			endOffset: text.length
		};

		showPopover = true;
	}

	async function handleHighlight() {
		if (!pendingSelection || !data.currentUserId) return;

		showPopover = false;

		try {
			const res = await fetch('/api/highlights', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					canvas_id: data.canvas.id,
					note_slug: pendingSelection.noteSlug,
					selected_text: pendingSelection.text,
					start_offset: pendingSelection.startOffset,
					end_offset: pendingSelection.endOffset
				})
			});

			if (!res.ok) throw new Error('Failed to create highlight');

			// Refresh highlights
			await refreshHighlights();
			sidebarOpen = true;
		} catch (err) {
			console.error('Failed to create highlight:', err);
		}

		window.getSelection()?.removeAllRanges();
		pendingSelection = null;
	}

	async function refreshHighlights() {
		const res = await fetch(`/api/highlights?canvas_id=${data.canvas.id}`);
		if (res.ok) {
			highlights = await res.json();
		}
	}

	async function handleAddComment(highlightId: string, body: string) {
		const res = await fetch('/api/comments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ highlight_id: highlightId, body })
		});

		if (!res.ok) throw new Error('Failed to add comment');
		await refreshHighlights();
	}

	async function handleDeleteComment(commentId: string) {
		const res = await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' });
		if (!res.ok) throw new Error('Failed to delete comment');
		await refreshHighlights();
	}

	async function handleDeleteHighlight(highlightId: string) {
		const res = await fetch(`/api/highlights?id=${highlightId}`, { method: 'DELETE' });
		if (!res.ok) throw new Error('Failed to delete highlight');
		await refreshHighlights();
	}

	let hasComments = $derived(highlights.length > 0);

	// Meeting state
	let showMeetingModal = $state(false);
	let meetingSent = $state(false);

	// Check if current user has commented on this canvas (unlocks Meet button)
	let userHasCommented = $derived(() => {
		if (!data.currentUserId) return false;
		return highlights.some(
			(h) =>
				h.user_id === data.currentUserId ||
				h.comments.some((c) => c.user_id === data.currentUserId)
		);
	});

	// Only show Meet button for conversation canvases, when not the author
	let canMeet = $derived(
		data.canvas.isConversation &&
		data.currentUserId &&
		data.currentUserId !== data.author.id &&
		userHasCommented()
	);
</script>

<svelte:head>
	<title>{data.canvas.name} - dyad. cultivating a culture of conversation</title>
	<meta name="description" content="A reading canvas by @{data.author.username}" />
	<meta http-equiv="Cache-Control" content="no-store" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<main class="app" onmouseup={handleTextSelection}>
	{#if loading}
		<div class="loading" out:fade={{ duration: 200 }}></div>
	{:else if error}
		<div class="error" in:fade={{ duration: 200 }}>
			<p>{error}</p>
			<button onclick={() => window.location.reload()}>Retry</button>
		</div>
	{:else}
		<div class="canvas-container" in:fade={{ duration: 200 }}>
			<Canvas readOnly={true} />

			<header class="canvas-header">
				<a href={data.currentUserId ? '/discover' : '/'} class="back-link" title="Back">
					<svg width="20" height="20" viewBox="0 0 16 16" fill="none">
						<path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</a>
			</header>

			{#if data.currentUserId}
				<button
					class="comments-toggle"
					class:has-comments={hasComments}
					onclick={() => (sidebarOpen = !sidebarOpen)}
					aria-label="Toggle comments"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M2 2h12v9H5l-3 3V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
					</svg>
					{#if highlights.length > 0}
						<span class="comment-count">{highlights.length}</span>
					{/if}
				</button>
			{/if}

			{#if canMeet && !meetingSent}
				<button
					class="meet-btn"
					onclick={() => (showMeetingModal = true)}
				>
					Meet @{data.author.username}
				</button>
			{/if}

			{#if meetingSent}
				<div class="meet-sent">Invitation sent!</div>
			{/if}

			<button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
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
</main>

{#if showPopover && pendingSelection}
	<HighlightPopover
		x={popoverX}
		y={popoverY}
		onHighlight={handleHighlight}
	/>
{/if}

<CommentSidebar
	open={sidebarOpen}
	{highlights}
	currentUserId={data.currentUserId ?? ''}
	{activeHighlightId}
	onClose={() => (sidebarOpen = false)}
	onAddComment={handleAddComment}
	onDeleteComment={handleDeleteComment}
	onDeleteHighlight={handleDeleteHighlight}
/>

{#if showMeetingModal}
	<MeetingInviteModal
		canvasId={data.canvas.id}
		inviteeId={data.author.id}
		inviteeUsername={data.author.username}
		preferredLocation={data.canvas.preferredLocation}
		preferredTimeSlots={data.canvas.preferredTimeSlots}
		onClose={() => (showMeetingModal = false)}
		onSent={() => {
			showMeetingModal = false;
			meetingSent = true;
		}}
	/>
{/if}

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

	.comments-toggle {
		position: fixed;
		bottom: 24px;
		right: 64px;
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
		gap: 2px;
		transition: all 0.2s ease;
		opacity: 0.4;
		z-index: 100;
	}

	.comments-toggle:hover,
	.comments-toggle.has-comments {
		opacity: 1;
	}

	.comment-count {
		font-size: 10px;
		font-family: inherit;
	}

	.meet-btn {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		padding: 8px 20px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-family: inherit;
		cursor: pointer;
		z-index: 100;
		transition: opacity 0.2s;
		white-space: nowrap;
	}

	.meet-btn:hover {
		opacity: 0.85;
	}

	.meet-sent {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		padding: 8px 20px;
		background: rgba(40, 167, 69, 0.15);
		color: #28a745;
		border: 1px solid rgba(40, 167, 69, 0.3);
		border-radius: 6px;
		font-size: 14px;
		font-family: inherit;
		z-index: 100;
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

	/* Back navigation header */
	.canvas-header {
		position: fixed;
		top: 16px;
		left: 16px;
		display: flex;
		align-items: center;
		gap: 10px;
		z-index: 100;
		background: var(--bg-canvas);
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid var(--border-link);
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	.canvas-header:hover {
		opacity: 1;
	}

	.back-link {
		display: flex;
		align-items: center;
		color: var(--text-muted);
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--text-primary);
	}

	.canvas-title {
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.canvas-author {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-family: monospace;
	}
</style>
