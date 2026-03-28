<script lang="ts">
	import { page } from '$app/stores';
	let { children } = $props();
</script>

<div class="admin-shell">
	<nav class="admin-nav">
		<a href="/discover" class="admin-logo">dyad</a>
		<div class="admin-tabs">
			<a href="/admin/waitlist" class="admin-tab" class:active={$page.url.pathname === '/admin/waitlist'}>Waitlist</a>
			<a href="/admin/feedback" class="admin-tab" class:active={$page.url.pathname === '/admin/feedback'}>Feedback</a>
		</div>
		<a href="/discover" class="admin-back">← back to app</a>
	</nav>

	<main class="admin-content">
		{@render children()}
	</main>
</div>

<style>
	.admin-shell {
		max-width: 960px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.admin-nav {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		margin-bottom: var(--space-8);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border-link);
	}

	.admin-logo {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 500;
	}

	.admin-tabs {
		display: flex;
		gap: var(--space-4);
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
		background: rgba(0, 0, 0, 0.05);
		font-weight: 500;
	}

	.admin-back {
		margin-left: auto;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.admin-back:hover { color: var(--text-primary); }

	.admin-content {
		width: 100%;
	}
</style>
