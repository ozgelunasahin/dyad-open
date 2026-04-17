<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Feedback — Admin</title>
</svelte:head>

<h1 class="admin-title">App Feedback</h1>
<p class="admin-subtitle">{data.entries.length} entries</p>

{#if data.entries.length === 0}
	<p class="empty">No feedback submitted yet.</p>
{:else}
	<div class="feedback-list">
		{#each data.entries as entry}
			<div class="feedback-card">
				<div class="feedback-header">
					<span class="badge badge-{entry.type}">{entry.type}</span>
					<span class="feedback-user">@{entry.username ?? 'unknown'}</span>
					<span class="feedback-date">{formatDate(entry.created_at)}</span>
					<span class="badge badge-status-{entry.status}">{entry.status}</span>
				</div>
				<p class="feedback-description">{entry.description}</p>
				{#if entry.pageUrl}
					<span class="feedback-meta">Page: {entry.pageUrl}</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.admin-title { font-size: var(--text-2xl); font-weight: normal; margin: 0 0 var(--space-1); }
	.admin-subtitle { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-6); }
	.empty { color: var(--text-muted); padding: var(--space-6) 0; }

	.feedback-card {
		padding: var(--space-4);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		margin-bottom: var(--space-3);
	}

	.feedback-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
		flex-wrap: wrap;
	}

	.badge {
		font-family: var(--font-mono);
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.badge-bug { background: rgba(239,68,68,0.12); color: #dc2626; }
	.badge-feature { background: rgba(59,130,246,0.12); color: #2563eb; }
	.badge-other { background: color-mix(in srgb, var(--text-primary) 6%, transparent); color: var(--text-muted); }
	.badge-status-new { background: rgba(245,158,11,0.12); color: #b45309; }
	.badge-status-reviewed { background: rgba(61,158,90,0.12); color: #2d7a42; }

	.feedback-user { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
	.feedback-date { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
	.feedback-description { font-size: var(--text-md); line-height: var(--leading-relaxed); margin: 0; }
	.feedback-meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-top: var(--space-2); word-break: break-all; }
</style>
