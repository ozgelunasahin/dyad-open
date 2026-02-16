<script lang="ts">
	/**
	 * Published Canvas - Read-only view with comment panel + meeting invite
	 * Mobile: uses ExpandableContent (toggle wikilinks) for better reading
	 * Desktop: uses Canvas (2D pan/zoom) for spatial exploration
	 */
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import Canvas from '$lib/components/Canvas.svelte';
	import ExpandableContent from '$lib/components/ExpandableContent.svelte';
	import MeetingInviteModal from '$lib/components/MeetingInviteModal.svelte';

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let isMobile = $state(false);
	let mobileMenuOpen = $state(false);

	// Comment panel
	let panelOpen = $state(false);
	let commentInput = $state('');
	let submitting = $state(false);

	// All comments (flattened from highlights)
	let highlights = $state(data.highlights ?? []);

	let allComments = $derived(
		highlights
			.flatMap(h => h.comments.map(c => ({ ...c, selectedText: h.selected_text })))
			.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
	);

	// One comment per user per canvas
	let userHasCommented = $derived(
		data.currentUserId
			? allComments.some(c => c.user_id === data.currentUserId)
			: true
	);

	function toggleTheme() {
		themeStore.toggle();
	}

	onMount(async () => {
		const mq = window.matchMedia('(max-width: 768px)');
		isMobile = mq.matches;
		const mqHandler = (e: MediaQueryListEvent) => { isMobile = e.matches; };
		mq.addEventListener('change', mqHandler);

		try {
			const hash = window.location.hash.slice(1);
			const vault = { ...data.vault };
			if (hash && vault.notes[hash]) {
				vault.entryPoint = hash;
			}

			if (!isMobile) {
				await canvasStore.initialize(vault, data.canvas.id, data.cardPositions, true);
			}
			loading = false;

			if (!isMobile) {
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
		if (event.key === 'Escape') {
			panelOpen = false;
		}
	}

	async function refreshHighlights() {
		const res = await fetch(`/api/highlights?canvas_id=${data.canvas.id}`);
		if (res.ok) {
			highlights = await res.json();
		}
	}

	async function handleSubmitComment() {
		const body = commentInput.trim();
		if (!body || !data.currentUserId) return;

		submitting = true;
		try {
			// Need a highlight to attach comment to. Use existing or create one.
			let highlightId: string;
			if (highlights.length > 0) {
				highlightId = highlights[0].id;
			} else {
				// Create a canvas-level highlight on the entry point note
				const entryNote = Object.keys(data.vault.notes)[0] ?? '';
				const res = await fetch('/api/highlights', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						canvas_id: data.canvas.id,
						note_slug: entryNote,
						selected_text: data.canvas.name,
						start_offset: 0,
						end_offset: 0
					})
				});
				if (!res.ok) throw new Error('Failed to create highlight');
				const h = await res.json();
				highlightId = h.id;
			}

			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ highlight_id: highlightId, body })
			});

			if (!res.ok) throw new Error('Failed to add comment');

			commentInput = '';
			await refreshHighlights();
		} catch (err) {
			console.error('Failed to submit comment:', err);
		} finally {
			submitting = false;
		}
	}

	// Meeting state
	let showMeetingModal = $state(false);
	let meetingSent = $state(false);

	// Show Meet option: conversation canvas, not the author, user has commented
	let canMeet = $derived(
		data.canvas.isConversation &&
		data.currentUserId &&
		data.currentUserId !== data.author.id &&
		userHasCommented
	);

	// Get the entry note for mobile ExpandableContent view
	let entryNote = $derived(() => {
		const entryId = data.vault?.entryPoint;
		return entryId ? data.vault?.notes?.[entryId] : null;
	});
</script>

<svelte:head>
	<title>{data.canvas.name} - dyad. cultivating a culture of conversation</title>
	<meta name="description" content="A reading canvas by @{data.author.username}" />
	<meta http-equiv="Cache-Control" content="no-store" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main class="app">
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
			<button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
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

			<header class="canvas-header">
				<a href={data.currentUserId ? '/discover' : '/'} class="back-link" title="Back">
					<svg width="20" height="20" viewBox="0 0 16 16" fill="none">
						<path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</a>
			</header>

			{#if data.currentUserId}
				<button
					class="comment-toggle"
					class:active={panelOpen}
					onclick={() => panelOpen = !panelOpen}
					aria-label="Toggle comments"
				>
					Comments
					{#if allComments.length > 0}
						<span class="comment-count">{allComments.length}</span>
					{/if}
				</button>
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

		<!-- Comment Panel (slides from right) -->
		{#if panelOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="panel-overlay" onclick={() => panelOpen = false}></div>
			<aside class="comment-panel" transition:fly={{ x: 320, duration: 250 }}>
				<div class="panel-header">
					<h2>Comments</h2>
					<button class="panel-close" onclick={() => panelOpen = false} aria-label="Close">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
						</svg>
					</button>
				</div>

				<div class="panel-body">
					{#if allComments.length === 0 && userHasCommented}
						<p class="empty-state">No comments yet.</p>
					{/if}

					{#each allComments as comment (comment.id)}
						<div class="comment-item">
							<p class="comment-author">@{comment.username}</p>
							<p class="comment-body">{comment.body}</p>
						</div>
					{/each}

					{#if !userHasCommented}
						<div class="comment-form">
							<textarea
								placeholder="Leave a comment..."
								bind:value={commentInput}
								rows={3}
								disabled={submitting}
							></textarea>
							<button
								class="submit-btn"
								onclick={handleSubmitComment}
								disabled={!commentInput.trim() || submitting}
							>
								{submitting ? 'Posting...' : 'Comment'}
							</button>
						</div>
					{/if}

					{#if canMeet && !meetingSent}
						<div class="meet-section">
							<p class="meet-prompt">Interested in continuing this conversation offline?</p>
							<button class="meet-btn" onclick={() => showMeetingModal = true}>
								Meet @{data.author.username}
							</button>
						</div>
					{/if}

					{#if meetingSent}
						<div class="meet-sent">Invitation sent!</div>
					{/if}
				</div>
			</aside>
		{/if}
	{/if}
</main>

{#if showMeetingModal}
	<MeetingInviteModal
		canvasId={data.canvas.id}
		inviteeId={data.author.id}
		inviteeUsername={data.author.username}
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

	/* Mobile reading view — scrollable with toggle wikilinks */
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
		text-decoration: none;
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

	/* Comment toggle button */
	.comment-toggle {
		position: fixed;
		bottom: 24px;
		right: 64px;
		padding: 6px 14px;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-control);
		cursor: pointer;
		color: var(--control-color);
		font-size: 13px;
		font-family: inherit;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all 0.2s ease;
		opacity: 0.6;
		z-index: 100;
	}

	.comment-toggle:hover,
	.comment-toggle.active {
		opacity: 1;
	}

	.comment-count {
		font-size: 10px;
		font-family: inherit;
		background: var(--text-muted);
		color: var(--bg-canvas);
		border-radius: 8px;
		padding: 1px 5px;
		min-width: 14px;
		text-align: center;
	}

	/* Panel overlay */
	.panel-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
	}

	/* Comment panel */
	.comment-panel {
		position: fixed;
		top: 0;
		right: 0;
		width: 340px;
		max-width: 90vw;
		height: 100vh;
		background: var(--bg-canvas);
		border-left: 1px solid var(--border-link);
		z-index: 300;
		display: flex;
		flex-direction: column;
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px 16px;
		border-bottom: 1px solid var(--border-link);
	}

	.panel-header h2 {
		margin: 0;
		font-size: 15px;
		font-weight: normal;
		color: var(--text-primary);
	}

	.panel-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		padding: 4px;
		display: flex;
		align-items: center;
		transition: color 0.15s;
	}

	.panel-close:hover {
		color: var(--text-primary);
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 20px 24px;
	}

	.empty-state {
		color: var(--text-muted);
		font-size: 14px;
		font-style: italic;
	}

	/* Comment items */
	.comment-item {
		padding-left: 16px;
		border-left: 1.5px solid var(--border-link);
		margin-bottom: 20px;
	}

	.comment-author {
		font-family: monospace;
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0 0 4px 0;
	}

	.comment-body {
		margin: 0;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	/* Comment form */
	.comment-form {
		margin-top: 16px;
	}

	.comment-form textarea {
		width: 100%;
		font-family: inherit;
		font-size: 14px;
		padding: 10px 12px;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-canvas);
		color: var(--text-primary);
		resize: vertical;
		line-height: 1.6;
		box-sizing: border-box;
	}

	.comment-form textarea:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.submit-btn {
		margin-top: 8px;
		padding: 6px 14px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.submit-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Meet section */
	.meet-section {
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid var(--border-link);
	}

	.meet-prompt {
		font-size: 13px;
		color: var(--text-muted);
		margin: 0 0 12px 0;
		line-height: 1.5;
	}

	.meet-btn {
		width: 100%;
		padding: 10px 16px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.meet-btn:hover {
		opacity: 0.85;
	}

	.meet-sent {
		margin-top: 24px;
		padding: 10px 16px;
		background: rgba(40, 167, 69, 0.1);
		color: #28a745;
		border: 1px solid rgba(40, 167, 69, 0.25);
		border-radius: 6px;
		font-size: 14px;
		text-align: center;
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

	/* Back navigation header (desktop) */
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
		display: inline-flex;
		align-items: center;
		color: var(--text-muted);
		transition: color 0.15s;
	}

	.back-link:hover {
		color: var(--text-primary);
	}
</style>
