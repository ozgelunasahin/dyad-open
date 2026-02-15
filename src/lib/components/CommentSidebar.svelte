<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	interface Comment {
		id: string;
		user_id: string;
		username: string;
		body: string;
		created_at: string;
	}

	interface Highlight {
		id: string;
		canvas_id: string;
		note_slug: string;
		user_id: string;
		username: string;
		selected_text: string;
		start_offset: number;
		end_offset: number;
		created_at: string;
		comments: Comment[];
	}

	let {
		open = false,
		highlights = [],
		currentUserId = '',
		activeHighlightId = null,
		onClose,
		onAddComment,
		onDeleteComment,
		onDeleteHighlight
	}: {
		open: boolean;
		highlights: Highlight[];
		currentUserId: string;
		activeHighlightId: string | null;
		onClose: () => void;
		onAddComment: (highlightId: string, body: string) => Promise<void>;
		onDeleteComment: (commentId: string) => Promise<void>;
		onDeleteHighlight: (highlightId: string) => Promise<void>;
	} = $props();

	let commentInputs = $state<Record<string, string>>({});
	let submitting = $state<string | null>(null);

	async function handleSubmitComment(highlightId: string) {
		const body = commentInputs[highlightId]?.trim();
		if (!body) return;

		submitting = highlightId;
		try {
			await onAddComment(highlightId, body);
			commentInputs[highlightId] = '';
		} finally {
			submitting = null;
		}
	}

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const mins = Math.floor(diff / 60000);
		const hours = Math.floor(mins / 60);
		const days = Math.floor(hours / 24);

		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sidebar-backdrop" onclick={onClose} transition:fade={{ duration: 150 }}></div>
	<aside class="comment-sidebar" transition:fly={{ x: 300, duration: 200 }}>
		<div class="sidebar-header">
			<h2>Comments</h2>
			<button class="close-btn" onclick={onClose} aria-label="Close sidebar">&times;</button>
		</div>

		<div class="sidebar-content">
			{#if highlights.length === 0}
				<p class="empty">No highlights yet. Select text to start a conversation.</p>
			{:else}
				{#each highlights as highlight (highlight.id)}
					<div
						class="highlight-group"
						class:active={activeHighlightId === highlight.id}
					>
						<div class="highlight-text">
							<span class="quote-mark">&ldquo;</span>
							{highlight.selected_text.slice(0, 200)}{highlight.selected_text.length > 200 ? '...' : ''}
							<span class="quote-mark">&rdquo;</span>
						</div>
						<div class="highlight-meta">
							<span class="highlight-author">@{highlight.username}</span>
							<span class="highlight-time">{formatTime(highlight.created_at)}</span>
							{#if highlight.user_id === currentUserId}
								<button
									class="delete-link"
									onclick={() => onDeleteHighlight(highlight.id)}
								>
									delete
								</button>
							{/if}
						</div>

						{#each highlight.comments as comment (comment.id)}
							<div class="comment">
								<div class="comment-header">
									<span class="comment-author">@{comment.username}</span>
									<span class="comment-time">{formatTime(comment.created_at)}</span>
									{#if comment.user_id === currentUserId}
										<button
											class="delete-link"
											onclick={() => onDeleteComment(comment.id)}
										>
											delete
										</button>
									{/if}
								</div>
								<p class="comment-body">{comment.body}</p>
							</div>
						{/each}

						<div class="add-comment">
							<textarea
								placeholder="Add a comment..."
								bind:value={commentInputs[highlight.id]}
								rows={2}
								disabled={submitting === highlight.id}
							></textarea>
							<button
								class="comment-submit"
								onclick={() => handleSubmitComment(highlight.id)}
								disabled={!commentInputs[highlight.id]?.trim() || submitting === highlight.id}
							>
								{submitting === highlight.id ? 'Posting...' : 'Comment'}
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</aside>
{/if}

<style>
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 999;
	}

	.comment-sidebar {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 380px;
		max-width: 100vw;
		background: var(--bg-canvas);
		border-left: 1px solid var(--border-link);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-link);
		flex-shrink: 0;
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.close-btn:hover {
		color: var(--text-primary);
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.5rem;
	}

	.empty {
		color: var(--text-muted);
		font-size: 0.9rem;
		text-align: center;
		padding: 2rem 0;
	}

	.highlight-group {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-link);
	}

	.highlight-group:last-child {
		border-bottom: none;
	}

	.highlight-group.active {
		background: var(--bg-control);
		margin: -0.75rem -1rem 1.5rem;
		padding: 0.75rem 1rem 1.5rem;
		border-radius: 6px;
	}

	.highlight-text {
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
		font-style: italic;
		margin-bottom: 0.5rem;
	}

	.quote-mark {
		color: var(--text-muted);
		font-size: 1.1rem;
	}

	.highlight-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}

	.highlight-author,
	.comment-author {
		font-family: monospace;
		font-size: 0.78rem;
	}

	.delete-link {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0;
		font-family: inherit;
		margin-left: auto;
	}

	.delete-link:hover {
		color: #dc3545;
	}

	.comment {
		margin-bottom: 0.75rem;
		padding-left: 0.75rem;
		border-left: 2px solid var(--border-link);
	}

	.comment-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-bottom: 0.25rem;
	}

	.comment-body {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-primary);
		line-height: 1.5;
	}

	.add-comment {
		margin-top: 0.75rem;
	}

	.add-comment textarea {
		width: 100%;
		font-family: inherit;
		font-size: 0.85rem;
		padding: 8px 10px;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-canvas);
		color: var(--text-primary);
		resize: vertical;
		line-height: 1.5;
		box-sizing: border-box;
	}

	.add-comment textarea:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.comment-submit {
		margin-top: 0.5rem;
		padding: 0.4rem 0.75rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.comment-submit:hover:not(:disabled) {
		opacity: 0.85;
	}

	.comment-submit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
