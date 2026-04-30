<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<div class="page-header">
		<h1>Field Notes</h1>
		<a href="/admin/newsletter/new" class="btn-new">+ New post</a>
	</div>

	{#if data.posts.length === 0}
		<p class="empty">No posts yet. <a href="/admin/newsletter/new">Create the first one.</a></p>
	{:else}
		<div class="list">
			{#each data.posts as post}
				<div class="row">
					<div class="row-meta">
						<span class="row-date">{post.published_at}</span>
						<span class="row-status" class:published={post.published}>
							{post.published ? 'published' : 'draft'}
						</span>
					</div>
					<div class="row-title">{post.title}</div>
					<div class="row-actions">
						<a href="/newsletter/{post.slug}" target="_blank" class="action-link">view</a>
						<a href="/admin/newsletter/{post.id}" class="action-link">edit</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		padding: var(--space-8) var(--space-10);
		max-width: 900px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-8);
	}

	.page-header h1 {
		font-size: var(--text-2xl);
		font-weight: 400;
		margin: 0;
	}

	.btn-new {
		padding: var(--space-2) var(--space-5);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-radius: var(--radius-input);
		font-size: var(--text-sm);
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.btn-new:hover { opacity: var(--opacity-hover-btn); }

	.list {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--border-link);
	}

	.row {
		display: grid;
		grid-template-columns: 180px 1fr auto;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-4) 0;
		border-bottom: 1px solid var(--border-link);
	}

	.row-meta {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.row-date {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.row-status {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		background: var(--bg-control);
		padding: 2px var(--space-2);
		border-radius: var(--radius-input);
	}

	.row-status.published {
		color: var(--color-success);
	}

	.row-title {
		font-size: var(--text-base);
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.row-actions {
		display: flex;
		gap: var(--space-4);
	}

	.action-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-decoration: none;
	}

	.action-link:hover { color: var(--text-primary); }

	.empty {
		color: var(--text-muted);
		font-size: var(--text-base);
	}

	.empty a { color: var(--text-primary); }
</style>
