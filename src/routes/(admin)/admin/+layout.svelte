<script lang="ts">
	import { page } from '$app/stores';
	import { copy } from '$lib/copy';

	let { children }: { children: any } = $props();
</script>

<main class="admin-main">
	<nav class="admin-tabs">
		<a href="/admin/waitlist" class="admin-tab" class:active={$page.url.pathname === '/admin/waitlist'}>{copy.admin.waitlist}</a>
		<a href="/admin/invites" class="admin-tab" class:active={$page.url.pathname === '/admin/invites'}>{copy.admin.invites}</a>
		<a href="/admin/members" class="admin-tab" class:active={$page.url.pathname === '/admin/members'}>{copy.admin.members}</a>
		<a href="/admin/scopes" class="admin-tab" class:active={$page.url.pathname.startsWith('/admin/scopes')}>{copy.admin.scopes}</a>
		<a href="/admin/conversations" class="admin-tab" class:active={$page.url.pathname === '/admin/conversations'}>{copy.admin.conversations}</a>
		<a href="/admin/feedback" class="admin-tab" class:active={$page.url.pathname === '/admin/feedback'}>{copy.admin.feedback}</a>
	</nav>

	<div class="admin-content">
		{@render children()}
	</div>
</main>

<style>
	.admin-main {
		min-height: 100vh;
		background: var(--bg-canvas);
		max-width: 960px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.admin-tabs {
		display: flex;
		gap: var(--space-4);
		margin-bottom: var(--space-8);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border-link);
	}

	.admin-tab {
		font-size: var(--text-sm);
		color: var(--text-muted);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-input);
	}
	.admin-tab:hover { color: var(--text-primary); }
	.admin-tab.active {
		color: var(--text-primary);
		background: var(--bg-control);
		font-weight: 500;
	}

	.admin-content { width: 100%; }

	@media (max-width: 768px) {
		.admin-main { padding: var(--space-4); }
	}
</style>
