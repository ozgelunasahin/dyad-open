<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(date: string): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(date));
	}
</script>

<svelte:head>
	<title>Discover - dyad.berlin</title>
</svelte:head>

<div class="app-layout">
	<aside class="sidebar">
		<a href="/" class="sidebar-logo">
			<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt="dyad" class="sidebar-logo-img" />
		</a>
		<nav class="sidebar-nav">
			<a href="/discover" class="sidebar-link active">Discover</a>
			<a href="/dashboard" class="sidebar-link">Profile</a>
		</nav>
		<div class="sidebar-bottom">
			<span class="sidebar-username">@{data.username}</span>
			<a href="/logout" class="sidebar-logout">sign out</a>
		</div>
	</aside>

	<main class="main-content">
		<header class="page-header">
			<h1>Discover</h1>
			<p class="subtitle">Active conversations from the community this week.</p>
		</header>

		<div class="content">
			{#if data.conversations.length === 0}
				<div class="empty-state">
					<p>No active conversations this week.</p>
					<p class="empty-hint">Check back soon, or start your own from the dashboard.</p>
				</div>
			{:else}
				<div class="conversation-list">
					{#each data.conversations as conversation}
						<a href="/@{conversation.username}/{conversation.slug}" class="conversation-row">
							<div class="row-thumb">
								{#if conversation.coverImageUrl}
									<img src={conversation.coverImageUrl} alt="" class="thumb-img" />
								{:else}
									<div class="thumb-placeholder"></div>
								{/if}
							</div>
							<div class="row-body">
								<div class="row-top">
									<h3 class="row-title">{conversation.name}</h3>
									<span class="date">{formatDate(conversation.updatedAt)}</span>
								</div>
								{#if conversation.snippet}
									<p class="row-snippet">{conversation.snippet}</p>
								{/if}
								<div class="row-meta">
									<span class="author">@{conversation.username}</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	:global(body) {
		overflow: auto !important;
	}

	/* === App layout with sidebar === */
	.app-layout {
		display: flex;
		min-height: 100vh;
		background: var(--bg-canvas);
	}

	.sidebar {
		width: 180px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 1.5rem 1.25rem;
		border-right: 1px solid var(--border-link);
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
	}

	.sidebar-logo {
		display: block;
		margin-bottom: 1.25rem;
		padding: 0 0.65rem;
	}

	.sidebar-logo-img {
		width: 22px;
		height: auto;
		object-fit: contain;
		opacity: 0.5;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sidebar-link {
		display: block;
		padding: 0.5rem 0.65rem;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		border-radius: 4px;
		transition: color 0.15s, background 0.15s;
	}

	.sidebar-link:hover {
		color: var(--text-primary);
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
	}

	.sidebar-link.active {
		color: var(--text-primary);
		font-weight: 500;
	}

	.sidebar-bottom {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sidebar-username {
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: monospace;
	}

	.sidebar-logout {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.8rem;
		transition: color 0.2s;
	}

	.sidebar-logout:hover {
		color: var(--text-primary);
	}

	.main-content {
		flex: 1;
		min-width: 0;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 2rem;
		max-width: 800px;
	}

	.page-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0.25rem 0 0;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.content {
		max-width: 800px;
	}

	/* Mobile: sidebar becomes top bar */
	@media (max-width: 768px) {
		.app-layout {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
			height: auto;
			position: static;
			flex-direction: row;
			align-items: center;
			padding: 0.75rem 1rem;
			border-right: none;
			border-bottom: 1px solid var(--border-link);
			gap: 1rem;
		}

		.sidebar-logo {
			margin-bottom: 0;
		}

		.sidebar-nav {
			flex-direction: row;
			gap: 0.5rem;
		}

		.sidebar-bottom {
			margin-top: 0;
			margin-left: auto;
			flex-direction: row;
			align-items: center;
			gap: 0.75rem;
		}
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: var(--text-muted);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.empty-hint {
		font-size: 0.9rem;
	}

	/* === Conversation list === */
	.conversation-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.conversation-row {
		display: flex;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border-link);
		text-decoration: none;
		transition: background 0.15s;
		align-items: flex-start;
	}

	.conversation-row:first-child {
		padding-top: 0;
	}

	.conversation-row:last-child {
		border-bottom: none;
	}

	.conversation-row:hover {
		background: var(--bg-control, rgba(0, 0, 0, 0.02));
		margin: 0 -0.5rem;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
		border-radius: 4px;
	}

	/* Thumbnail */
	.row-thumb {
		flex-shrink: 0;
		width: 72px;
		height: 72px;
		border-radius: 6px;
		overflow: hidden;
	}

	.thumb-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumb-placeholder {
		width: 100%;
		height: 100%;
		background: var(--bg-control, rgba(0, 0, 0, 0.05));
		border: 1px solid var(--border-link);
		border-radius: 6px;
	}

	/* Body */
	.row-body {
		flex: 1;
		min-width: 0;
	}

	.row-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
	}

	.row-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.3;
		min-width: 0;
	}

	.date {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.row-snippet {
		margin: 0.3rem 0 0;
		color: var(--text-secondary);
		font-size: 0.88rem;
		line-height: 1.45;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.row-meta {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-top: 0.35rem;
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.author {
		font-family: monospace;
		font-size: 0.78rem;
	}

	/* Responsive: stack on mobile */
	@media (max-width: 600px) {
		.conversation-row {
			flex-wrap: wrap;
		}

		.row-thumb {
			width: 56px;
			height: 56px;
		}
	}
</style>
