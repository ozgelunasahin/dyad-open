<script lang="ts">
	interface Comment {
		id: string;
		user_id: string;
		username: string;
		body: string;
		created_at: string;
	}

	interface Props {
		x: number;
		y: number;
		width: number;
		selectedText: string;
		comments: Comment[];
		currentUserId?: string;
		onAddComment?: (highlightId: string, body: string) => Promise<void>;
		highlightId: string;
	}

	let { x, y, width, selectedText, comments, currentUserId, onAddComment, highlightId }: Props = $props();

	// Auto-measure height via ResizeObserver (same pattern as NoteCard)
	let contentDiv: HTMLDivElement;
	let measuredHeight = $state(80);

	$effect(() => {
		if (!contentDiv) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newHeight = Math.ceil(entry.contentRect.height);
				if (newHeight > 0) {
					measuredHeight = newHeight;
				}
			}
		});

		observer.observe(contentDiv);
		return () => observer.disconnect();
	});

	// Truncate selected text at 200 chars
	let displayText = $derived(
		selectedText.length > 200
			? selectedText.slice(0, 200) + '...'
			: selectedText
	);

	// One comment per highlight per user: hide input if already commented
	let userHasCommented = $derived(
		currentUserId ? comments.some(c => c.user_id === currentUserId) : true
	);

	let commentInput = $state('');
	let submitting = $state(false);

	async function handleSubmit() {
		const body = commentInput.trim();
		if (!body || !onAddComment) return;

		submitting = true;
		try {
			await onAddComment(highlightId, body);
			commentInput = '';
		} finally {
			submitting = false;
		}
	}
</script>

<foreignObject
	{x}
	{y}
	{width}
	height={measuredHeight}
	class="text-block-container"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={contentDiv}
		xmlns="http://www.w3.org/1999/xhtml"
		class="text-block"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Quoted highlight text (like a wikilink title) -->
		<p class="highlight-quote">&ldquo;{displayText}&rdquo;</p>

		<!-- Comments as toggle-body blocks (like expanded wikilink content) -->
		{#each comments as comment (comment.id)}
			<div class="toggle-body">
				<p class="comment-author">@{comment.username}</p>
				<p class="comment-text">{comment.body}</p>
			</div>
		{/each}

		{#if currentUserId && !userHasCommented && onAddComment}
			<div class="add-comment">
				<textarea
					placeholder="Add a comment..."
					bind:value={commentInput}
					rows={2}
					disabled={submitting}
				></textarea>
				<button
					class="comment-submit"
					onclick={handleSubmit}
					disabled={!commentInput.trim() || submitting}
				>
					{submitting ? 'Posting...' : 'Comment'}
				</button>
			</div>
		{/if}
	</div>
</foreignObject>

<style>
	.text-block-container {
		overflow: visible;
	}

	/* Matches NoteCard .text-block exactly */
	.text-block {
		position: relative;
		min-height: 100%;
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		padding: 8px 0;
	}

	.highlight-quote {
		margin: 0 0 0.8em 0;
		font-style: italic;
		color: var(--text-muted);
	}

	/* Matches ExpandableContent .toggle-body */
	.toggle-body {
		padding-left: 20px;
		margin: 0 0 1em 0;
		border-left: 1.5px solid var(--border-link);
	}

	.comment-author {
		font-family: monospace;
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0 0 2px 0;
	}

	.comment-text {
		margin: 0;
		color: var(--text-secondary);
	}

	.add-comment {
		margin-top: 8px;
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
		margin-top: 6px;
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
