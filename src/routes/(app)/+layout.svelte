<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let currentPath = $derived($page.url.pathname);
</script>

<div class="app-layout">
	<aside class="sidebar">
		<a href="/discover" class="sidebar-logo">
			<img src="/images/logo.png" alt="dyad" class="sidebar-logo-img" />
		</a>
		<nav class="sidebar-nav">
			<a href="/discover" class="sidebar-link" class:active={currentPath === '/discover'}>Discover</a>
			<a href="/profile" class="sidebar-link" class:active={currentPath === '/profile'}>
				Profile
				{#if data.attentionCount > 0}<span class="sidebar-badge">{data.attentionCount}</span>{/if}
			</a>
			{#if data.isAdmin}
				<a href="/admin" class="sidebar-link" class:active={currentPath.startsWith('/admin')}>Admin</a>
			{/if}
		</nav>
		<div class="sidebar-bottom">
			<span class="sidebar-username">@{data.username}</span>
			<a href="/logout" class="sidebar-logout">sign out</a>
		</div>
	</aside>

	<main class="main-content">
		{@render children()}
	</main>
</div>

<FeedbackModal />

<style>
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

	.sidebar-logo { display: block; margin-bottom: 1.25rem; padding: 0 0.65rem; }
	.sidebar-logo-img { width: 22px; height: auto; object-fit: contain; filter: brightness(0) opacity(0.4); }
	:global([data-theme='dark']) .sidebar-logo-img { filter: brightness(0) invert(1) opacity(0.7); }

	.sidebar-nav { display: flex; flex-direction: column; gap: 0.25rem; }
	.sidebar-link { display: block; padding: 0.5rem 0.65rem; color: var(--text-muted); text-decoration: none; font-size: 0.9rem; border-radius: 4px; transition: color 0.15s, background 0.15s; }
	.sidebar-link:hover { color: var(--text-primary); background: var(--bg-control, rgba(0, 0, 0, 0.03)); }
	.sidebar-link.active { color: var(--text-primary); font-weight: 500; }

	.sidebar-badge {
		font-family: var(--font-mono);
		font-size: 10px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		padding: 1px 5px;
		border-radius: var(--space-2);
		margin-left: var(--space-2);
		vertical-align: middle;
	}

	.sidebar-bottom { margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; }
	.sidebar-username { color: var(--text-muted); font-size: 0.8rem; font-family: monospace; }
	.sidebar-logout { color: var(--text-muted); text-decoration: none; font-size: 0.8rem; transition: color 0.2s; }
	.sidebar-logout:hover { color: var(--text-primary); }

	.main-content { flex: 1; min-width: 0; padding: 2rem; display: flex; flex-direction: column; align-items: center; }

	/* Mobile: hide sidebar entirely — FloatingNav handles navigation */
	@media (max-width: 430px) {
		.sidebar { display: none; }
		.main-content { padding: 1rem; }
	}
</style>
