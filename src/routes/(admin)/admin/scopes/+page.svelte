<script lang="ts">
	import type { PageData } from './$types';
	import type { ScopeOverviewRow } from './+page.server';
	import { REGIONS } from '$lib/services/location.js';

	let { data }: { data: PageData } = $props();

	let creating = $state(false);
	let createError = $state<string | null>(null);
	let newScope = $state('');
	let newName = $state('');
	let newDescription = $state('');
	let newRegion = $state('');

	async function createScope() {
		creating = true;
		createError = null;
		try {
			const res = await fetch('/admin/scopes/api', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					scope: newScope.trim(),
					name: newName.trim(),
					description: newDescription.trim() || undefined,
					region: newRegion || undefined
				})
			});
			const body = await res.json();
			if (!res.ok) {
				createError = body.error ?? 'Failed to create scope';
				return;
			}
			newScope = '';
			newName = '';
			newDescription = '';
			newRegion = '';
			location.reload();
		} catch {
			createError = 'Network error';
		} finally {
			creating = false;
		}
	}

	async function toggleRetire(row: ScopeOverviewRow) {
		const retiring = row.retired_at === null;
		const verb = retiring ? 'Retire' : 'Restore';
		if (!confirm(`${verb} the "${row.name}" corner?`)) return;
		const res = await fetch('/admin/scopes/api', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ scope: row.scope, retired: retiring })
		});
		if (res.ok) location.reload();
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
	<title>Scopes — Admin</title>
</svelte:head>

<h1 class="admin-title">Scopes</h1>
<p class="admin-subtitle">{data.scopes.length} corners</p>

<details class="create-form">
	<summary>Create a new corner</summary>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			createScope();
		}}
	>
		<label class="field">
			<span>Slug</span>
			<input
				type="text"
				bind:value={newScope}
				required
				pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
				placeholder="lowercase-with-hyphens"
				disabled={creating}
			/>
		</label>
		<label class="field">
			<span>Name</span>
			<input
				type="text"
				bind:value={newName}
				required
				maxlength="100"
				placeholder="Human-readable name"
				disabled={creating}
			/>
		</label>
		<label class="field">
			<span>Description</span>
			<textarea
				bind:value={newDescription}
				maxlength="1000"
				rows="3"
				placeholder="One paragraph for the welcome screen."
				disabled={creating}
			></textarea>
		</label>
		<label class="field">
			<span>Region</span>
			<select bind:value={newRegion} disabled={creating}>
				<option value="">Berlin (default)</option>
				{#each Object.entries(REGIONS) as [key, def] (key)}
					{#if key !== 'berlin'}
						<option value={key}>{def.label}</option>
					{/if}
				{/each}
			</select>
		</label>
		{#if createError}
			<p class="create-error">{createError}</p>
		{/if}
		<button class="btn-primary" type="submit" disabled={creating}>
			{creating ? 'Creating...' : 'Create corner'}
		</button>
	</form>
</details>

{#if data.scopes.length === 0}
	<p class="empty-state">No corners yet. Create one above to begin.</p>
{:else}
	<table class="scopes-table">
		<thead>
			<tr>
				<th>Corner</th>
				<th class="numeric">Members</th>
				<th class="numeric">Posts</th>
				<th>Created</th>
				<th>Status</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.scopes as row (row.scope)}
				<tr class:retired={row.retired_at !== null}>
					<td>
						<a href="/admin/scopes/{row.scope}" class="scope-link">
							<span class="scope-name">{row.name}</span>
							<span class="scope-slug">{row.scope}</span>
						</a>
					</td>
					<td class="numeric">{row.member_count}</td>
					<td class="numeric">{row.post_count}</td>
					<td class="muted">{formatDate(row.created_at)}</td>
					<td>
						{#if row.retired_at}
							<span class="status-retired">retired</span>
						{:else}
							<span class="status-active">active</span>
						{/if}
					</td>
					<td>
						<button class="btn-ghost" onclick={() => toggleRetire(row)}>
							{row.retired_at ? 'Restore' : 'Retire'}
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	.admin-title {
		font-size: var(--text-2xl);
		font-weight: normal;
		margin: 0 0 var(--space-1);
	}
	.admin-subtitle {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-6);
	}

	.create-form {
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		background: var(--bg-control);
		border-radius: var(--radius-input);
	}
	.create-form summary {
		cursor: pointer;
		font-size: var(--text-sm);
	}
	.create-form form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
	}
	.field span {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.field input,
	.field select,
	.field textarea {
		font-family: inherit;
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
	}
	.create-error {
		font-size: var(--text-sm);
		color: var(--text-error, #c83d3d);
		margin: 0;
	}

	.empty-state {
		font-size: var(--text-sm);
		color: var(--text-muted);
		font-style: italic;
	}

	.scopes-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	.scopes-table th,
	.scopes-table td {
		text-align: left;
		padding: var(--space-3);
		border-bottom: 1px solid var(--border-link);
	}
	.scopes-table th {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-transform: uppercase;
		font-weight: normal;
	}
	.scopes-table th.numeric,
	.scopes-table td.numeric {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.scopes-table tr.retired {
		opacity: 0.55;
	}
	.scope-link {
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-decoration: none;
	}
	.scope-name {
		color: var(--text-primary);
	}
	.scope-slug {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.muted {
		color: var(--text-muted);
		font-size: var(--text-xs);
	}
	.status-active {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-success, #3d9e5a);
	}
	.status-retired {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
</style>
