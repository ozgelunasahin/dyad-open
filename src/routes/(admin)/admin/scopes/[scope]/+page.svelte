<script lang="ts">
	import type { PageData } from './$types';
	import type { ScopeMemberRow } from './+page.server';

	let { data }: { data: PageData } = $props();

	let granting = $state(false);
	let grantUsername = $state('');
	let grantError = $state<string | null>(null);

	async function grantMember() {
		if (!grantUsername.trim()) return;
		granting = true;
		grantError = null;
		try {
			const res = await fetch(`/admin/scopes/${data.scope.scope}/api`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: grantUsername.trim() })
			});
			const body = await res.json();
			if (!res.ok) {
				grantError = body.error ?? 'Failed to grant scope';
				return;
			}
			grantUsername = '';
			location.reload();
		} catch {
			grantError = 'Network error';
		} finally {
			granting = false;
		}
	}

	async function toggleRevoke(member: ScopeMemberRow) {
		const revoking = member.revoked_at === null;
		const verb = revoking ? 'Revoke' : 'Restore';
		const who = member.username ?? member.identity_id;
		if (!confirm(`${verb} ${who}'s grant to "${data.scope.name}"?`)) return;
		const res = await fetch(`/admin/scopes/${data.scope.scope}/api`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identity_id: member.identity_id, revoked: revoking })
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

	function formatRelative(iso: string | null): string {
		if (!iso) return 'no activity';
		const ms = Date.now() - new Date(iso).getTime();
		const days = Math.floor(ms / 86_400_000);
		if (days === 0) return 'today';
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
		if (days < 365) return `${Math.floor(days / 30)} months ago`;
		return `${Math.floor(days / 365)} years ago`;
	}

	let activeCount = $derived(data.members.filter((m) => m.revoked_at === null).length);
</script>

<svelte:head>
	<title>{data.scope.name} — Admin Scopes</title>
</svelte:head>

<a class="back-link" href="/admin/scopes">← All corners</a>

<h1 class="admin-title">{data.scope.name}</h1>
<p class="admin-subtitle">
	<span class="scope-slug">{data.scope.scope}</span>
	{#if data.scope.retired_at}
		<span class="retired-tag">retired {formatDate(data.scope.retired_at)}</span>
	{/if}
</p>

{#if data.scope.description}
	<p class="description">{data.scope.description}</p>
{/if}

<dl class="meta-grid">
	<dt>Members (active)</dt>
	<dd>{activeCount}</dd>
	<dt>Members (total inc. revoked)</dt>
	<dd>{data.members.length}</dd>
	<dt>Posts</dt>
	<dd>{data.scope.post_count}</dd>
	<dt>Created</dt>
	<dd>{formatDate(data.scope.created_at)}</dd>
</dl>

<details class="grant-form">
	<summary>Grant to a member</summary>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			grantMember();
		}}
	>
		<label class="field">
			<span>Username</span>
			<input
				type="text"
				bind:value={grantUsername}
				required
				placeholder="member-username"
				disabled={granting}
			/>
		</label>
		{#if grantError}
			<p class="grant-error">{grantError}</p>
		{/if}
		<button class="btn-primary" type="submit" disabled={granting || !grantUsername.trim()}>
			{granting ? 'Granting...' : 'Grant access'}
		</button>
	</form>
</details>

{#if data.members.length === 0}
	<p class="empty-state">No members yet. Grant access above, or attach this scope to an invitation.</p>
{:else}
	<table class="members-table">
		<thead>
			<tr>
				<th>Member</th>
				<th>Granted</th>
				<th>Last active</th>
				<th>Status</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.members as member (member.identity_id)}
				<tr class:revoked={member.revoked_at !== null}>
					<td>
						<span class="member-name">{member.display_name ?? member.username ?? '—'}</span>
						{#if member.username && member.display_name}
							<span class="member-handle">@{member.username}</span>
						{/if}
					</td>
					<td class="muted">{formatDate(member.granted_at)}</td>
					<td class="muted">{formatRelative(member.last_active_at)}</td>
					<td>
						{#if member.revoked_at}
							<span class="status-revoked">revoked</span>
						{:else}
							<span class="status-active">active</span>
						{/if}
					</td>
					<td>
						<button class="btn-ghost" onclick={() => toggleRevoke(member)}>
							{member.revoked_at ? 'Restore' : 'Revoke'}
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	.back-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-decoration: none;
		margin-bottom: var(--space-4);
		display: inline-block;
	}

	.admin-title {
		font-size: var(--text-2xl);
		font-weight: normal;
		margin: 0 0 var(--space-1);
	}
	.admin-subtitle {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		margin: 0 0 var(--space-4);
	}
	.scope-slug {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.retired-tag {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.description {
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0 0 var(--space-6);
		max-width: 60ch;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-1) var(--space-4);
		margin: 0 0 var(--space-6);
		font-size: var(--text-sm);
	}
	.meta-grid dt {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.meta-grid dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	.grant-form {
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		background: var(--bg-control);
		border-radius: var(--radius-input);
	}
	.grant-form summary {
		cursor: pointer;
		font-size: var(--text-sm);
	}
	.grant-form form {
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
	.field input {
		font-family: inherit;
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
	}
	.grant-error {
		font-size: var(--text-sm);
		color: var(--text-error, #c83d3d);
		margin: 0;
	}

	.empty-state {
		font-size: var(--text-sm);
		color: var(--text-muted);
		font-style: italic;
	}

	.members-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	.members-table th,
	.members-table td {
		text-align: left;
		padding: var(--space-3);
		border-bottom: 1px solid var(--border-link);
	}
	.members-table th {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-transform: uppercase;
		font-weight: normal;
	}
	.members-table tr.revoked {
		opacity: 0.55;
	}
	.member-name {
		display: block;
		color: var(--text-primary);
	}
	.member-handle {
		display: block;
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
	.status-revoked {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
</style>
