<script lang="ts">
	import { page } from '$app/stores';
	import { copy } from '$lib/copy';

	let { username, attentionCount = 0 }: {
		username: string;
		attentionCount?: number;
	} = $props();

	let currentPath = $derived($page.url.pathname);
</script>

<aside class="sidebar">
	<a href="/discover" class="sidebar-logo">
		<img src="/images/logo.png" alt="dyad" class="sidebar-logo-img" />
	</a>
	<nav class="sidebar-nav">
		<a href="/discover" class="sidebar-link" class:active={currentPath === '/discover'}>{copy.nav.discover}</a>
		<a href="/profile" class="sidebar-link" class:active={currentPath === '/profile'}>
			{copy.nav.profile}
			{#if attentionCount > 0}<span class="sidebar-badge">{attentionCount}</span>{/if}
		</a>
	</nav>
	<div class="sidebar-bottom">
		<span class="sidebar-username">@{username}</span>
		<form method="POST" action="/logout" class="sidebar-logout-form">
			<button type="submit" class="sidebar-logout">{copy.nav.signOut}</button>
		</form>
	</div>
</aside>

<style>
	.sidebar {
		width: 180px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: var(--space-6) var(--space-5);
		border-right: 1px solid var(--border-link);
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
	}

	.sidebar-logo { display: block; margin-bottom: var(--space-5); padding: 0 0.65rem; }
	.sidebar-logo-img { width: 22px; height: auto; object-fit: contain; filter: brightness(0) opacity(0.4); }
	:global([data-theme='dark']) .sidebar-logo-img { filter: brightness(0) invert(1) opacity(0.7); }

	.sidebar-nav { display: flex; flex-direction: column; gap: var(--space-1); }
	.sidebar-link { display: block; padding: var(--space-2) 0.65rem; color: var(--text-muted); text-decoration: none; font-size: var(--text-base); border-radius: var(--radius-input); transition: color 0.15s, background 0.15s; }
	.sidebar-link:hover { color: var(--text-primary); background: var(--bg-control); }
	.sidebar-link.active { color: var(--text-primary); font-weight: 500; }

	.sidebar-badge {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		background: var(--text-primary);
		color: var(--bg-canvas);
		padding: 1px 5px;
		border-radius: var(--space-2);
		margin-left: var(--space-2);
		vertical-align: middle;
	}

	.sidebar-bottom { margin-top: auto; display: flex; flex-direction: column; gap: var(--space-2); }
	.sidebar-username { color: var(--text-muted); font-size: var(--text-sm); font-family: var(--font-mono); }
	.sidebar-logout-form { margin: 0; padding: 0; }
	.sidebar-logout {
		color: var(--text-muted);
		text-decoration: none;
		font-size: var(--text-sm);
		transition: color 0.2s;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}
	.sidebar-logout:hover { color: var(--text-primary); }

	@media (max-width: 768px) {
		.sidebar { display: none; }
	}
</style>
