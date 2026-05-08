<script lang="ts">
	import type { PageData } from './$types';
	import type { MemberRow } from './+page.server';

	let { data }: { data: PageData } = $props();

	type SortKey = 'last_active_at' | 'username';

	let sortKey = $state<SortKey>('last_active_at');
	let sortDir = $state<'asc' | 'desc'>('desc');

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
		// Nulls always sort last regardless of direction.
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
</script>

<svelte:head>
	<title>Members — Admin</title>
</svelte:head>

<h1 class="admin-title">Members</h1>
<p class="admin-subtitle">{data.members.length} members</p>

<table class="members-table">
	<thead>
		<tr>
			<th class="sortable" onclick={() => setSort('username')}>Member</th>
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
</style>
