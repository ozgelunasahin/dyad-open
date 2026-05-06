<script lang="ts">
	import type { PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	// Local copy of the loaded list so per-row updates render without refetching.
	// On the wire each row is a serializable POJO from +page.server.ts.
	let conversations = $state(data.conversations);

	// Per-row in-flight state and per-row error string (cleared on next action).
	let pendingId = $state<string | null>(null);
	let errorByRow = $state<Record<string, string>>({});

	async function toggleVisibility(id: string, currentlyHidden: boolean) {
		pendingId = id;
		const { [id]: _omit, ...rest } = errorByRow;
		errorByRow = rest;

		try {
			const res = await fetch('/admin/conversations/api', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id,
					action: currentlyHidden ? 'unhide' : 'hide'
				})
			});
			const body = await res.json();
			if (res.ok) {
				conversations = conversations.map((c) =>
					c.id === id ? { ...c, hidden_at: body.hidden_at ?? null } : c
				);
			} else {
				errorByRow = { ...errorByRow, [id]: body.error ?? copy.admin.hideError };
			}
		} catch {
			errorByRow = { ...errorByRow, [id]: copy.admin.hideError };
		} finally {
			pendingId = null;
		}
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Conversations — Admin</title>
</svelte:head>

<h1 class="admin-title">{copy.admin.conversations}</h1>
<p class="admin-subtitle">{conversations.length} conversations</p>

<table class="admin-table">
	<thead>
		<tr>
			<th>Title</th>
			<th>Author</th>
			<th>State</th>
			<th>Created</th>
			<th>Visibility</th>
			<th>Action</th>
		</tr>
	</thead>
	<tbody>
		{#each conversations as c (c.id)}
			{@const isHidden = c.hidden_at !== null}
			{@const isPending = pendingId === c.id}
			<tr class:hidden-row={isHidden}>
				<td>
					<a
						class="conversation-link"
						href="/conversations/{c.id}"
						target="_blank"
						rel="noopener noreferrer">
						{c.title ?? '(untitled)'}
					</a>
				</td>
				<td>{c.author_username ?? c.author_id.slice(0, 8)}</td>
				<td>
					<span class="state-badge state-{c.state}">{c.state}</span>
				</td>
				<td class="date-cell">{formatDate(c.created_at)}</td>
				<td>
					{#if isHidden}
						<span class="hidden-marker" title="Hidden at {c.hidden_at}">{copy.admin.hidden}</span>
					{:else}
						<span class="visible-marker">visible</span>
					{/if}
				</td>
				<td>
					<button
						class="action-button"
						onclick={() => toggleVisibility(c.id, isHidden)}
						disabled={isPending}>
						{isPending ? '…' : isHidden ? copy.admin.unhide : copy.admin.hide}
					</button>
					{#if errorByRow[c.id]}
						<div class="row-error">{errorByRow[c.id]}</div>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.admin-title {
		font-size: var(--text-xl);
		margin-bottom: var(--space-1);
	}

	.admin-subtitle {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-bottom: var(--space-6);
	}

	.admin-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.admin-table th,
	.admin-table td {
		padding: var(--space-2) var(--space-3);
		text-align: left;
		border-bottom: 1px solid var(--border-subtle);
		vertical-align: top;
	}

	.admin-table th {
		font-weight: 500;
		color: var(--text-muted);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.hidden-row {
		opacity: 0.6;
	}

	.conversation-link {
		color: var(--text-primary);
		text-decoration: none;
	}
	.conversation-link:hover {
		text-decoration: underline;
		text-decoration-color: var(--border-link);
	}

	.state-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-input);
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		background: var(--bg-control);
		color: var(--text-muted);
	}

	.state-published {
		color: var(--text-primary);
	}

	.date-cell {
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.hidden-marker {
		color: var(--text-muted);
		font-style: italic;
	}

	.visible-marker {
		color: var(--text-muted);
	}

	.action-button {
		font-size: var(--text-xs);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-input);
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		cursor: pointer;
		font-family: inherit;
	}
	.action-button:hover:not(:disabled) {
		border-color: var(--border-link-hover);
	}
	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.row-error {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin-top: var(--space-1);
	}

	@media (max-width: 768px) {
		.admin-table {
			font-size: var(--text-xs);
		}
		.admin-table th,
		.admin-table td {
			padding: var(--space-2);
		}
	}
</style>
