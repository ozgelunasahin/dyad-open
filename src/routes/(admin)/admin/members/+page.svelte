<script lang="ts">
	import type { PageData } from './$types';
	import type { MemberRow } from './+page.server';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	type SortKey = 'last_active_at' | 'username';

	let sortKey = $state<SortKey>('last_active_at');
	let sortDir = $state<'asc' | 'desc'>('desc');

	// Grant form.
	const SOURCES = ['comp', 'founding', 'grandfathered'] as const;
	let grantUsername = $state('');
	let grantSource = $state<(typeof SOURCES)[number]>('comp');
	let busy = $state(false);
	let message = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);

	function setSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = key === 'username' ? 'asc' : 'desc';
		}
	}

	function compare(a: MemberRow, b: MemberRow): number {
		const av = a[sortKey];
		const bv = b[sortKey];
		if (av === null && bv === null) return 0;
		if (av === null) return 1;
		if (bv === null) return -1;
		const as = String(av);
		const bs = String(bv);
		return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
	}

	let sortedMembers = $derived([...data.members].sort(compare));

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

	async function grant(event: Event) {
		event.preventDefault();
		if (!grantUsername.trim() || busy) return;
		busy = true;
		message = null;
		try {
			const res = await fetch('/admin/members/membership-api', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: grantUsername.trim(), source: grantSource })
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				message = { kind: 'ok', text: `Granted ${grantSource} to @${grantUsername.trim()}.` };
				grantUsername = '';
				await invalidateAll();
			} else {
				message = { kind: 'error', text: body.error ?? 'Failed to grant membership.' };
			}
		} catch {
			message = { kind: 'error', text: 'Network error.' };
		} finally {
			busy = false;
		}
	}

	async function revoke(m: MemberRow) {
		if (busy) return;
		if (!confirm(`Revoke membership for @${m.username ?? m.id}?`)) return;
		busy = true;
		message = null;
		try {
			const res = await fetch('/admin/members/membership-api', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identity_id: m.id, active: false })
			});
			const body = await res.json().catch(() => ({}));
			if (res.ok) {
				await invalidateAll();
			} else {
				message = { kind: 'error', text: body.error ?? 'Failed to revoke membership.' };
			}
		} catch {
			message = { kind: 'error', text: 'Network error.' };
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Members — Admin</title>
</svelte:head>

<h1 class="admin-title">Members</h1>
<p class="admin-subtitle">{data.members.length} members</p>

<form class="grant-form" onsubmit={grant}>
	<input
		type="text"
		placeholder="username to grant"
		bind:value={grantUsername}
		disabled={busy}
		aria-label="username"
	/>
	<select bind:value={grantSource} disabled={busy} aria-label="grant source">
		{#each SOURCES as s (s)}
			<option value={s}>{s}</option>
		{/each}
	</select>
	<button type="submit" disabled={busy || !grantUsername.trim()}>grant membership</button>
</form>
{#if message}
	<p class="grant-message" class:error={message.kind === 'error'}>{message.text}</p>
{/if}

<table class="members-table">
	<thead>
		<tr>
			<th class="sortable" onclick={() => setSort('username')}>Member</th>
			<th>Membership</th>
			<th class="sortable" onclick={() => setSort('last_active_at')}>Last active</th>
		</tr>
	</thead>
	<tbody>
		{#each sortedMembers as m (m.id)}
			<tr>
				<td>
					<span class="username">@{m.username ?? 'anonymous'}</span>
					{#if m.display_name}
						<span class="display-name">{m.display_name}</span>
					{/if}
				</td>
				<td class="membership">
					{#if m.membership?.active}
						<span class="badge">{m.membership.source}{m.membership.cadence ? ` · ${m.membership.cadence}` : ''}</span>
						<button class="revoke" disabled={busy} onclick={() => revoke(m)}>revoke</button>
					{:else if m.membership}
						<span class="badge inactive">inactive</span>
					{:else}
						<span class="none">—</span>
					{/if}
				</td>
				<td class="date" class:dormant={m.last_active_at === null}>
					{formatRelative(m.last_active_at)}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.admin-title {
		font-size: var(--text-2xl);
		font-weight: normal;
		margin: 0 0 var(--space-2);
	}

	.admin-subtitle {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-6);
	}

	.grant-form {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin: 0 0 var(--space-3);
	}
	.grant-form input,
	.grant-form select,
	.grant-form button {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		font-size: var(--text-sm);
		background: var(--bg-canvas);
	}
	.grant-form button {
		cursor: pointer;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-color: var(--text-primary);
	}
	.grant-form button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.grant-message {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0 0 var(--space-4);
	}
	.grant-message.error {
		color: var(--text-danger, #b03a2e);
	}

	.members-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.members-table th,
	.members-table td {
		padding: var(--space-2) var(--space-3);
		text-align: left;
		border-bottom: 1px solid var(--border-link);
	}

	.members-table th {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		font-weight: normal;
	}

	.members-table th.sortable {
		cursor: pointer;
		user-select: none;
	}
	.members-table th.sortable:hover {
		color: var(--text-primary);
	}

	.members-table td.date {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.members-table td.date.dormant {
		opacity: 0.6;
	}

	.username {
		font-weight: 500;
	}

	.display-name {
		display: block;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.badge {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		padding: 2px var(--space-2);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-pill, 999px);
		color: var(--text-primary);
	}
	.badge.inactive {
		color: var(--text-muted);
	}
	.none {
		color: var(--text-muted);
	}
	.revoke {
		margin-left: var(--space-2);
		font-size: var(--text-xs);
		background: none;
		border: none;
		color: var(--text-danger, #b03a2e);
		cursor: pointer;
		text-decoration: underline;
	}
	.revoke:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
