<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<main class="admin-main">
	<nav class="admin-tabs">
		<a href="/admin/waitlist" class="admin-tab" class:active={$page.url.pathname === '/admin/waitlist'}>Waitlist</a>
		<a href="/admin/feedback" class="admin-tab" class:active={$page.url.pathname === '/admin/feedback'}>Feedback</a>
	</nav>

	<div class="admin-content">
		{@render children()}
	</div>
</main>

<FeedbackModal isAdmin={data.isAdmin} />

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
