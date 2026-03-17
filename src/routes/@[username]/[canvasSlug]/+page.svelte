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
	let meetingInviteeId = $state(data.author.id);
	let meetingInviteeUsername = $state(data.author.username);

	function openMeetModal(inviteeId: string, inviteeUsername: string) {
		meetingInviteeId = inviteeId;
		meetingInviteeUsername = inviteeUsername;
		showMeetingModal = true;
	}

	// Letter icon on comments: only visible to the author (to invite each commenter)
	function canShowInvite(comment: { userId: string }) {
		if (!data.currentUserId || !data.canvas.isConversation) return false;
		return data.currentUserId === data.author.id && comment.userId !== data.currentUserId;
	}

	function handleCommentInvite(comment: { userId: string; username: string }) {
		openMeetModal(comment.userId, comment.username);
	}

	// Local reactive comment list — starts from server data, updated optimistically on submit
	let comments = $state([...data.canvasComments]);

	let alreadyCommented = $derived(
		comments.some((c) => c.userId === data.currentUserId)
	);

	// Discussion section ref for scrolling
	let discussionRef = $state<HTMLElement | null>(null);
	let bookmarked = $state(false);

	function scrollToDiscussion() {
		discussionRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function shareCanvas() {
		if (navigator.share) {
			navigator.share({ title: data.canvas.name, url: window.location.href });
		} else {
			navigator.clipboard.writeText(window.location.href);
		}
	}

	function formatCommentTime(iso: string) {
		const d = new Date(iso);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Get the entry note for mobile ExpandableContent view
	let entryNote = $derived(() => {
		const entryId = data.vault?.entryPoint;
		return entryId ? data.vault?.notes?.[entryId] : null;
	});

	// Parse available dates from preferredTimeSlots
	let availableDates = $derived.by(() => {
		if (!data.canvas.preferredTimeSlots) return [];
		try {
			const parsed = JSON.parse(data.canvas.preferredTimeSlots);
			const results: string[] = [];
			if (Array.isArray(parsed.slots)) {
				for (const slot of parsed.slots) {
					if (!slot.date) continue;
					const d = new Date(slot.date + 'T12:00:00');
					const dayStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
					const timeStr = slot.startTime
						? new Date(`2000-01-01T${slot.startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
						: '';
					results.push(timeStr ? `${dayStr} at ${timeStr}` : dayStr);
				}
			} else if (Array.isArray(parsed.dates)) {
				for (const date of parsed.dates) {
					const d = new Date(date + 'T12:00:00');
					const dayStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
					const timeStr = parsed.startTime
						? new Date(`2000-01-01T${parsed.startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
						: '';
					results.push(timeStr ? `${dayStr} at ${timeStr}` : dayStr);
				}
			}
			return results;
		} catch { return []; }
	});

	// Mobile note state
	let mobileNoteText = $state('');
	let mobileNoteSubmitting = $state(false);
	let mobileNoteSubmitted = $state(false);
	let mobileNoteError = $state('');

	async function submitMobileNote() {
		if (!mobileNoteText.trim() || mobileNoteSubmitting || !data.currentUserId) return;
		mobileNoteSubmitting = true;
		mobileNoteError = '';
		const body = mobileNoteText.trim();
		try {
			const res = await fetch('/api/canvas-comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ canvas_id: data.canvas.id, body })
			});
			if (res.ok) {
				// Append optimistically so it shows immediately
				const saved = await res.json().catch(() => null);
				comments = [...comments, {
					id: saved?.id ?? crypto.randomUUID(),
					userId: data.currentUserId!,
					username: saved?.username ?? 'you',
					body,
					created_at: new Date().toISOString()
				}];
				mobileNoteSubmitted = true;
				mobileNoteText = '';
			} else {
				const d = await res.json().catch(() => ({}));
				mobileNoteError = (d as any).message ?? 'Failed to send';
			}
		} finally {
			mobileNoteSubmitting = false;
		}
	}
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
				<a href={data.currentUserId ? '/discover' : '/'} class="logo-link" aria-label="Back">
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
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="mobile-overlay" onclick={() => mobileMenuOpen = false}></div>
				<aside class="mobile-panel" transition:fly={{ x: 300, duration: 250 }}>
					<nav class="mobile-panel-nav">
						{#if data.currentUserId}
							<a href="/discover" onclick={() => mobileMenuOpen = false}>discover</a>
							<a href="/dashboard" onclick={() => mobileMenuOpen = false}>profile</a>
							<a href="/logout" onclick={() => mobileMenuOpen = false}>sign out</a>
						{:else}
							<a href="/" onclick={() => mobileMenuOpen = false}>home</a>
							<a href="/#join" onclick={() => mobileMenuOpen = false}>join</a>
							<a href="/login" onclick={() => mobileMenuOpen = false}>log in</a>
						{/if}
					</nav>
				</aside>
			{/if}
			<div class="mobile-article-header">
				<hr class="mobile-article-divider" />
				<div class="mobile-article-meta">
					<span class="mobile-article-author">@{data.author.username}</span>
					{#if availableDates.length > 0}
						<span class="mobile-article-date">{availableDates[0]}</span>
					{/if}
				</div>
				<h1 class="mobile-article-title">{data.canvas.name}</h1>
				<hr class="mobile-article-divider" />
			</div>

			{#if entryNote()}
				<ExpandableContent
					content={entryNote().content}
					vault={data.vault}
				/>
			{/if}

			{#if data.canvas.isConversation}
				<!-- Action bar -->
				<div class="action-bar">
					<div class="action-bar-left">
						<button
							class="action-btn"
							class:active={bookmarked}
							onclick={() => bookmarked = !bookmarked}
							aria-label="Bookmark"
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
							</svg>
						</button>
						<button class="action-btn" onclick={scrollToDiscussion} aria-label="Comments">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
							</svg>
							{#if comments.length > 0}
								<span class="action-count">{comments.length}</span>
							{/if}
						</button>
						{#if data.currentUserId && data.currentUserId !== data.author.id && (alreadyCommented || mobileNoteSubmitted)}
							{#if !meetingSent}
								<button class="action-btn action-invite-text" onclick={() => openMeetModal(data.author.id, data.author.username)}>
									invite to meet
								</button>
							{:else}
								<span class="action-invite-sent">invite sent</span>
							{/if}
						{/if}
					</div>
					<button class="action-btn action-share" onclick={shareCanvas} aria-label="Share">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
						</svg>
						<span>Share</span>
					</button>
				</div>

				<!-- Discussion section -->
				<div class="discussion" bind:this={discussionRef}>
					<h2 class="discussion-title">Comments</h2>

					{#if data.currentUserId && data.currentUserId !== data.author.id && !alreadyCommented && !mobileNoteSubmitted}
						<div class="write-note-box">
							<textarea
								class="write-note-input"
								placeholder="Write a comment..."
								value={mobileNoteText}
								oninput={(e) => mobileNoteText = (e.target as HTMLTextAreaElement).value}
								rows={3}
							></textarea>
							{#if mobileNoteError}
								<p class="mobile-note-error">{mobileNoteError}</p>
							{/if}
							<button
								class="write-note-btn"
								onclick={submitMobileNote}
								disabled={mobileNoteSubmitting || !mobileNoteText.trim()}
							>
								{mobileNoteSubmitting ? 'Sending...' : 'Send'}
							</button>
						</div>
					{:else if mobileNoteSubmitted}
						<p class="note-sent-msg">Comment sent.</p>
					{/if}

					{#if comments.length > 0}
						<div class="discussion-comments">
							{#each comments as comment (comment.id)}
								<div class="discussion-comment">
									<div class="discussion-comment-header">
										<span class="discussion-comment-author">@{comment.username}</span>
										<span class="discussion-comment-date">{formatCommentTime(comment.created_at)}</span>
										{#if canShowInvite(comment)}
											<button
												class="letter-btn"
												onclick={() => handleCommentInvite(comment)}
												aria-label="Invite to meet"
												title="Invite to meet in person"
											>
												<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
													<rect x="2" y="4" width="20" height="16" rx="2"/>
													<path d="M2 7l10 7 10-7"/>
												</svg>
											</button>
										{/if}
									</div>
									<p class="discussion-comment-body">{comment.body}</p>
								</div>
							{/each}
						</div>
					{:else if data.currentUserId}
						<p class="discussion-empty">No notes yet. Be the first.</p>
					{/if}
					</div>
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
		inviteeId={meetingInviteeId}
		inviteeUsername={meetingInviteeUsername}
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

	.mobile-article-header {
		margin-bottom: 1.5rem;
	}

	.mobile-article-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(1.6rem, 7vw, 2rem);
		font-weight: normal;
		line-height: 1.25;
		color: var(--text-primary, #1a1a1a);
		margin: 0.85rem 0;
	}

	.mobile-article-meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.85rem;
		margin-bottom: 0.85rem;
	}

	.mobile-article-author {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted, #888);
	}

	.mobile-article-date {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--text-muted, #888);
		text-align: right;
		white-space: nowrap;
	}

	.mobile-article-divider {
		border: none;
		border-top: 1px solid var(--border-link, rgba(0,0,0,0.1));
		margin: 0;
	}

	.action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 0;
		border-top: 1px solid var(--border-link, rgba(0,0,0,0.1));
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.1));
		margin: 1.5rem 0 0;
	}

	.action-bar-left {
		display: flex;
		gap: 0.25rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: none;
		border: none;
		padding: 0.45rem 0.6rem;
		border-radius: 20px;
		cursor: pointer;
		color: var(--text-muted, #888);
		font-size: 0.8rem;
		font-family: inherit;
		transition: background 0.15s, color 0.15s;
	}

	.action-btn:hover { background: rgba(0,0,0,0.05); color: var(--text-primary, #1a1a1a); }
	.action-btn.active { color: var(--text-primary, #1a1a1a); }

	.action-share {
		gap: 0.4rem;
		font-size: 0.8rem;
	}

	.action-invite-text {
		font-size: 0.85rem;
		color: var(--text-muted, #888);
		padding: 0.35rem 0.75rem;
		border: 1px solid var(--border-link, rgba(0,0,0,0.15));
		border-radius: 20px;
		background: none;
	}

	.action-invite-text:hover {
		color: var(--text-primary, #1a1a1a);
		border-color: var(--text-muted, #888);
		background: none;
	}

	.action-invite-sent {
		font-size: 0.85rem;
		color: var(--text-muted, #888);
		padding: 0.35rem 0.6rem;
	}

	.action-count {
		font-size: 0.75rem;
		color: inherit;
	}

	.discussion {
		margin: 1.5rem 0 3rem;
	}

	.discussion-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		font-weight: normal;
		color: var(--text-primary, #1a1a1a);
		margin: 0 0 1.25rem;
	}

	.write-note-box {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.write-note-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-link, rgba(0,0,0,0.12));
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--bg-canvas, #f5f3f0);
		color: var(--text-primary, #1a1a1a);
		resize: vertical;
		box-sizing: border-box;
		line-height: 1.5;
	}

	.write-note-input:focus { outline: none; border-color: var(--text-muted, #888); }
	.write-note-input::placeholder { color: var(--text-muted, #aaa); }

	.write-note-btn {
		align-self: flex-end;
		padding: 0.45rem 1.1rem;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border: none;
		border-radius: 20px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.write-note-btn:disabled { opacity: 0.4; cursor: default; }
	.write-note-btn:not(:disabled):hover { opacity: 0.8; }

	.note-sent-msg {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		color: var(--text-muted, #888);
		margin: 0 0 1.5rem;
	}

	.mobile-note-error {
		font-size: 0.8rem;
		color: #c0392b;
		margin: 0;
	}

	.discussion-comments {
		display: flex;
		flex-direction: column;
	}

	.discussion-comment {
		padding: 1rem 0;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.08));
	}

	.discussion-comment-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.discussion-comment-author {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 11px;
		letter-spacing: 0.05em;
		color: var(--text-primary, #1a1a1a);
		font-weight: 500;
	}

	.discussion-comment-date {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 10px;
		color: var(--text-muted, #aaa);
		flex: 1;
	}

	.letter-btn {
		background: none;
		border: none;
		padding: 0.2rem;
		cursor: pointer;
		color: var(--text-muted, #bbb);
		display: flex;
		align-items: center;
		transition: color 0.15s;
		border-radius: 4px;
	}

	.letter-btn:hover { color: var(--text-primary, #1a1a1a); }

	.discussion-comment-body {
		margin: 0;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--text-primary, #1a1a1a);
	}

	.discussion-empty {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		color: var(--text-muted, #aaa);
		margin: 0.5rem 0;
	}

	.commenter-invite-btn {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 1.5rem;
		padding: 0.55rem 1rem;
		background: none;
		border: 1px solid var(--border-link, rgba(0,0,0,0.15));
		border-radius: 20px;
		font-size: 0.82rem;
		font-family: inherit;
		color: var(--text-muted, #888);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.commenter-invite-btn:hover {
		border-color: var(--text-primary, #1a1a1a);
		color: var(--text-primary, #1a1a1a);
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

	.mobile-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.15);
		z-index: 200;
	}

	.mobile-panel {
		position: fixed;
		top: 0;
		right: 0;
		width: 280px;
		max-width: 80vw;
		height: 100vh;
		background: var(--bg-canvas, #f5f3f0);
		z-index: 300;
		padding: 24px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
	}

	.mobile-panel-nav {
		display: flex;
		flex-direction: column;
		margin-top: 32px;
	}

	.mobile-panel-nav a {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 18px;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		text-decoration: none;
		padding: 14px 0;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		transition: color 0.15s;
	}

	.mobile-panel-nav a:hover {
		color: var(--text-muted, #666);
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
