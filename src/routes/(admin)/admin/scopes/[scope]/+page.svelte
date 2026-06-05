<script lang="ts">
	import type { PageData } from './$types';
	import type { GroupLinkRow, ScopeMemberRow } from './+page.server';
	import { regionLabel, REGIONS } from '$lib/services/location.js';

	let { data }: { data: PageData } = $props();

	let granting = $state(false);
	let grantUsername = $state('');
	let grantError = $state<string | null>(null);

	// ── Region (post-hoc) ───────────────────────────────────────────────────
	// Corners created before regions existed (e.g. a prod stub) get their
	// region set here. Existing conversations keep their published region.
	// svelte-ignore state_referenced_locally — intentional initial-value capture
	let regionValue = $state(data.scope.region ?? '');
	let regionError = $state<string | null>(null);

	async function saveRegion() {
		// Changing a live corner's region re-homes every active guest's feed to
		// the new region on their next request — conversations published under
		// the old region stop matching, so the corner can look empty. Warn when
		// guests are present (guestCount derived below).
		const label = regionValue || 'Berlin (default)';
		const warning =
			guestCount > 0
				? `Change this corner's region to "${label}"? ${guestCount} active guest${guestCount === 1 ? '' : 's'} will switch to the new region on their next request, and conversations published under the old region won't appear in their feed. Continue?`
				: `Change this corner's region to "${label}"?`;
		if (!confirm(warning)) return;
		regionError = null;
		const res = await fetch(`/admin/scopes/${data.scope.scope}/api`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'set_region', region: regionValue || null })
		});
		if (res.ok) {
			location.reload();
			return;
		}
		const resBody = await res.json().catch(() => null);
		regionError = resBody?.error ?? 'Failed to set region';
	}

	// ── Group links ────────────────────────────────────────────────────────
	let creatingLink = $state(false);
	let linkError = $state<string | null>(null);
	let linkLabel = $state('');
	let linkJoinCloses = $state('');
	let linkAccessExpires = $state('');
	let linkCap = $state('');
	let copiedLinkId = $state<string | null>(null);

	/** datetime-local value (operator's local time) → UTC instant, or null. */
	function toInstant(value: string): Date | null {
		if (!value) return null;
		const d = new Date(value);
		return isNaN(d.getTime()) ? null : d;
	}

	function formatInstant(value: string): string {
		const d = toInstant(value);
		return d ? `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC` : '—';
	}

	async function createLink() {
		const joinCloses = toInstant(linkJoinCloses);
		const accessExpires = toInstant(linkAccessExpires);
		if (!joinCloses || !accessExpires) {
			linkError = 'Both timestamps are required';
			return;
		}
		creatingLink = true;
		linkError = null;
		try {
			const res = await fetch(`/admin/scopes/${data.scope.scope}/links/api`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					label: linkLabel.trim() || undefined,
					join_closes_at: joinCloses.toISOString(),
					access_expires_at: accessExpires.toISOString(),
					max_redemptions: linkCap ? Number(linkCap) : undefined
				})
			});
			const body = await res.json();
			if (!res.ok) {
				linkError = body.error ?? 'Failed to create group link';
				return;
			}
			location.reload();
		} catch {
			linkError = 'Network error';
		} finally {
			creatingLink = false;
		}
	}

	async function toggleLinkRevoke(link: GroupLinkRow) {
		const revoking = link.revoked_at === null;
		const message = revoking
			? `Revoke this group link? New joins stop immediately; members who already joined keep access until their window ends.`
			: `Restore this group link? It accepts new joins again (within its join window and cap).`;
		if (!confirm(message)) return;
		linkError = null;
		const res = await fetch(`/admin/scopes/${data.scope.scope}/links/api`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: link.id, revoked: revoking })
		});
		if (res.ok) {
			location.reload();
			return;
		}
		const resBody = await res.json().catch(() => null);
		linkError = resBody?.error ?? 'Failed to update group link';
	}

	async function copyLink(link: GroupLinkRow) {
		try {
			await navigator.clipboard.writeText(link.url);
			copiedLinkId = link.id;
			setTimeout(() => (copiedLinkId = null), 2000);
		} catch {
			// Clipboard unavailable — the URL is visible in the row for manual copy.
		}
	}

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
		// patchGuests surfaces failures via extendError — a silent non-ok here
		// would leave the operator believing the toggle landed.
		await patchGuests({ identity_id: member.identity_id, revoked: revoking });
	}

	// ── Guest window management ────────────────────────────────────────────
	// One datetime-local feeds both the per-guest extend and the bulk action.
	let extendTo = $state('');
	let extendError = $state<string | null>(null);

	function extendInstant(): string | null {
		if (!extendTo) return null;
		const d = new Date(extendTo);
		return isNaN(d.getTime()) ? null : d.toISOString();
	}

	async function patchGuests(body: Record<string, unknown>) {
		extendError = null;
		const res = await fetch(`/admin/scopes/${data.scope.scope}/api`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (res.ok) {
			location.reload();
			return;
		}
		const resBody = await res.json().catch(() => null);
		extendError = resBody?.error ?? 'Request failed';
	}

	async function extendGuest(member: ScopeMemberRow) {
		const instant = extendInstant();
		if (!instant) {
			extendError = 'Pick the new end time first (field above the table).';
			return;
		}
		const who = member.username ?? member.identity_id;
		if (!confirm(`Extend ${who}'s access until ${new Date(instant).toLocaleString()}?`)) return;
		await patchGuests({ action: 'extend', identity_id: member.identity_id, access_expires_at: instant });
	}

	async function extendAllGuests() {
		const instant = extendInstant();
		if (!instant) {
			extendError = 'Pick the new end time first.';
			return;
		}
		if (!confirm(`Extend ALL guests of "${data.scope.name}" until ${new Date(instant).toLocaleString()}?`)) return;
		await patchGuests({ action: 'extend_all_guests', access_expires_at: instant });
	}

	async function convertGuest(member: ScopeMemberRow) {
		const who = member.username ?? member.identity_id;
		if (
			!confirm(
				`Convert ${who} to a permanent member? Their access no longer ends, they keep this corner, and they see the commons from now on.`
			)
		)
			return;
		await patchGuests({ action: 'convert', identity_id: member.identity_id });
	}

	let guestCount = $derived(data.members.filter((m) => m.home_scope === data.scope.scope).length);

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
	<dt>Region</dt>
	<dd class="region-row">
		<select bind:value={regionValue}>
			<option value="">Berlin (default)</option>
			{#each Object.entries(REGIONS) as [key, def] (key)}
				{#if key !== 'berlin'}
					<option value={key}>{def.label}</option>
				{/if}
			{/each}
		</select>
		{#if regionValue !== (data.scope.region ?? '')}
			<button class="btn-ghost" onclick={saveRegion}>Save region</button>
		{/if}
		{#if regionError}
			<span class="grant-error">{regionError}</span>
		{/if}
	</dd>
	<dt>Created</dt>
	<dd>{formatDate(data.scope.created_at)}</dd>
</dl>

<section class="links-section">
	<h2 class="section-title">Group links</h2>
	{#if !data.scope.region}
		<p class="region-warning">
			This corner has no region set — members joining via a group link will get the Berlin map
			and Berlin location search.
		</p>
	{/if}

	<details class="grant-form">
		<summary>Create a group link</summary>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				createLink();
			}}
		>
			<label class="field">
				<span>Label (internal)</span>
				<input
					type="text"
					bind:value={linkLabel}
					maxlength="100"
					placeholder="e.g. Public Spaces 2026"
					disabled={creatingLink}
				/>
			</label>
			<label class="field">
				<span>Joining closes (your local time)</span>
				<input type="datetime-local" bind:value={linkJoinCloses} required disabled={creatingLink} />
				{#if linkJoinCloses}
					<span class="utc-hint">{formatInstant(linkJoinCloses)}</span>
				{/if}
			</label>
			<label class="field">
				<span>Access ends (your local time)</span>
				<input
					type="datetime-local"
					bind:value={linkAccessExpires}
					required
					disabled={creatingLink}
				/>
				{#if linkAccessExpires}
					<span class="utc-hint">{formatInstant(linkAccessExpires)}</span>
				{/if}
			</label>
			<label class="field">
				<span>Max joins (optional — leave headroom: failed signups can consume slots)</span>
				<input
					type="number"
					bind:value={linkCap}
					min="1"
					step="1"
					placeholder="uncapped"
					disabled={creatingLink}
				/>
			</label>
			<button class="btn-primary" type="submit" disabled={creatingLink}>
				{creatingLink ? 'Creating...' : 'Create group link'}
			</button>
		</form>
	</details>

	{#if linkError}
		<p class="grant-error">{linkError}</p>
	{/if}

	{#if data.links.length > 0}
		<table class="members-table">
			<thead>
				<tr>
					<th>Label</th>
					<th>Joins until</th>
					<th>Access ends</th>
					<th>Joined</th>
					<th>Status</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.links as link (link.id)}
					<tr class:revoked={link.revoked_at !== null}>
						<td>
							<span class="member-name">{link.label ?? '—'}</span>
							<span class="member-handle link-url">{link.url}</span>
						</td>
						<td class="muted">{formatDate(link.join_closes_at)}</td>
						<td class="muted">{formatDate(link.access_expires_at)}</td>
						<td class="muted">
							{link.redemption_count}{link.max_redemptions ? ` / ${link.max_redemptions}` : ''}
						</td>
						<td>
							{#if link.status === 'active'}
								<span class="status-active">active</span>
							{:else}
								<span class="status-revoked">{link.status}</span>
							{/if}
						</td>
						<td class="link-actions">
							<button class="btn-ghost" onclick={() => copyLink(link)}>
								{copiedLinkId === link.id ? 'Copied' : 'Copy link'}
							</button>
							<button class="btn-ghost" onclick={() => toggleLinkRevoke(link)}>
								{link.revoked_at ? 'Restore' : 'Revoke'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

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
	{#if guestCount > 0}
		<div class="guest-controls">
			<label class="field">
				<span>New access end (your local time) — used by Extend buttons</span>
				<input type="datetime-local" bind:value={extendTo} />
			</label>
			<button class="btn-ghost" onclick={extendAllGuests}>
				Extend all {guestCount} guests
			</button>
		</div>
	{/if}
	{#if extendError}
		<p class="grant-error">{extendError}</p>
	{/if}
	<table class="members-table">
		<thead>
			<tr>
				<th>Member</th>
				<th>Granted</th>
				<th>Last active</th>
				<th>Access</th>
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
						{#if member.home_scope === data.scope.scope}
							<span class="guest-tag">guest</span>
							<span class="member-handle">
								{member.access_expires_at
									? `until ${formatDate(member.access_expires_at)}`
									: 'no window'}
							</span>
						{:else}
							<span class="muted">member</span>
						{/if}
					</td>
					<td>
						{#if member.revoked_at}
							<span class="status-revoked">revoked</span>
						{:else}
							<span class="status-active">active</span>
						{/if}
					</td>
					<td class="member-actions">
						{#if member.home_scope === data.scope.scope}
							<button class="btn-ghost" onclick={() => extendGuest(member)}>Extend</button>
							<button class="btn-ghost" onclick={() => convertGuest(member)}>Convert</button>
						{/if}
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

	.links-section {
		margin: 0 0 var(--space-6);
	}
	.section-title {
		font-size: var(--text-lg);
		font-weight: normal;
		margin: 0 0 var(--space-3);
	}
	.region-warning {
		font-size: var(--text-sm);
		color: var(--text-error, #c83d3d);
		margin: 0 0 var(--space-3);
		max-width: 60ch;
	}
	.utc-hint {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.link-url {
		word-break: break-all;
	}
	.link-actions {
		white-space: nowrap;
	}

	.guest-controls {
		display: flex;
		align-items: flex-end;
		gap: var(--space-4);
		margin: 0 0 var(--space-4);
	}
	.region-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.region-row select {
		font-family: inherit;
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
	}
	.guest-tag {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-primary);
		background: var(--bg-control);
		padding: 2px var(--space-2);
		border-radius: var(--radius-input);
	}
	.member-actions {
		white-space: nowrap;
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
