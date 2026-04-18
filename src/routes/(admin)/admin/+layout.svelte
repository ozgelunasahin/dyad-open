<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import { copy } from '$lib/copy';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { children }: { data: LayoutData; children: any } = $props();
</script>

<main class="admin-main">
	<a href="/discover" class="back-to-app">
		<svg class="back-icon" width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
		{copy.admin.backToApp}
	</a>
	<nav class="admin-tabs">
		<a href="/admin/waitlist" class="admin-tab" class:active={$page.url.pathname === '/admin/waitlist'}>{copy.admin.waitlist}</a>
		<a href="/admin/invites" class="admin-tab" class:active={$page.url.pathname === '/admin/invites'}>{copy.admin.invites}</a>
		<a href="/admin/feedback" class="admin-tab" class:active={$page.url.pathname === '/admin/feedback'}>{copy.admin.feedback}</a>
	</nav>

	<div class="admin-content">
		{@render children()}
	</div>
</main>

<FeedbackModal />

<style>
	.admin-main {
		min-height: 100vh;
		background: var(--bg-canvas);
		max-width: 960px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.back-to-app {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-decoration: none;
		display: block;
		margin-bottom: var(--space-4);
	}
	.back-to-app:hover { color: var(--text-primary); }
	.back-icon { vertical-align: middle; margin-right: var(--space-1); }

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
