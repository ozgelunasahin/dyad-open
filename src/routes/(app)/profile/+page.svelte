<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import FloatingNav from '$lib/components/FloatingNav.svelte';

	let { data }: { data: PageData } = $props();

	let drafts = $derived(data.prompts.filter((p: Prompt) => p.state === 'draft'));
	let published = $derived(data.prompts.filter((p: Prompt) => p.state === 'published'));
	let archived = $derived(data.prompts.filter((p: Prompt) => p.state === 'archived'));

	// Detail view state
	let activeView = $state<'overview' | 'conversations' | 'meetings' | 'archive' | 'invitations'>('overview');

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Profile - dyad.berlin</title>
</svelte:head>

<div class="content">
	{#if activeView === 'overview'}
		<!-- Profile header card -->
		<div class="profile-card">
			<div class="profile-left">
				<div class="avatar">{(data.username ?? 'U')[0].toUpperCase()}</div>
				<div class="profile-name">{data.username}</div>
				<div class="profile-handle">@{data.username}</div>
			</div>
			<div class="profile-stats">
				<div class="stat"><span class="stat-num">{published.length}</span><span class="stat-label">ACTIVE</span></div>
				<div class="stat"><span class="stat-num">{data.meetings.length}</span><span class="stat-label">MEETINGS</span></div>
			</div>
		</div>

		<!-- Action card grid -->
		<div class="action-grid">
			<button class="action-card" onclick={() => activeView = 'conversations'}>
				<div class="card-thumb-stack">
					{#if published.length > 0}
						<div class="thumb-placeholder"></div>
					{:else}
						<div class="thumb-placeholder"></div>
					{/if}
				</div>
				<span class="card-label">Conversations</span>
				{#if published.length > 0}<span class="active-dot"></span>{/if}
			</button>

			<button class="action-card" onclick={() => activeView = 'meetings'}>
				<div class="card-thumb-stack">
					<div class="thumb-placeholder"></div>
				</div>
				<span class="card-label">Meetings</span>
			</button>

			<button class="action-card" onclick={() => activeView = 'archive'}>
				<div class="card-thumb-stack">
					<div class="thumb-placeholder"></div>
				</div>
				<span class="card-label">Archive</span>
			</button>

			<button class="action-card" onclick={() => activeView = 'invitations'}>
				<div class="card-thumb-stack">
					<div class="thumb-placeholder"></div>
				</div>
				<span class="card-label">Invitations</span>
				{#if data.sentInvitations.length > 0}<span class="count-badge">{data.sentInvitations.length}</span>{/if}
			</button>
		</div>

	{:else}
		<!-- Detail views -->
		<button class="back-btn" onclick={() => activeView = 'overview'}>← Back</button>

		{#if activeView === 'conversations'}
			<h2 class="view-title">My conversations</h2>
			{#each [...published, ...drafts] as prompt (prompt.id)}
				<a href={prompt.state === 'draft' ? `/prompts/${prompt.id}/edit` : `/prompts/${prompt.id}`} class="list-item">
					<span class="item-title">{prompt.title || 'Untitled'}</span>
					<span class="badge badge-{prompt.state}">{prompt.state}</span>
					<span class="item-date">{formatDate(prompt.updated_at)}</span>
				</a>
			{:else}
				<p class="empty">No conversations yet. <a href="/prompts/new">Start one</a></p>
			{/each}

		{:else if activeView === 'meetings'}
			<h2 class="view-title">Meetings</h2>
			{#each data.meetings as meeting}
				<a href="/meetings/{meeting.id}" class="list-item">
					<span class="item-title">{formatDate(meeting.scheduled_time)}</span>
					<span class="item-date">{meeting.duration_minutes} min</span>
				</a>
			{:else}
				<p class="empty">No meetings yet.</p>
			{/each}

		{:else if activeView === 'archive'}
			<h2 class="view-title">Archive</h2>
			{#each archived as prompt (prompt.id)}
				<a href="/prompts/{prompt.id}" class="list-item">
					<span class="item-title">{prompt.title || 'Untitled'}</span>
					<span class="item-date">{formatDate(prompt.updated_at)}</span>
				</a>
			{:else}
				<p class="empty">No archived conversations.</p>
			{/each}

		{:else if activeView === 'invitations'}
			<h2 class="view-title">Invitations sent</h2>
			{#each data.sentInvitations as inv}
				<div class="list-item">
					<span class="item-title">{inv.prompts?.title ?? 'Untitled'}</span>
					<span class="badge badge-{inv.state}">{inv.state}</span>
					<span class="item-date">{formatDate(inv.created_at)}</span>
				</div>
			{:else}
				<p class="empty">No invitations sent.</p>
			{/each}
		{/if}
	{/if}
</div>

<FloatingNav position="bottom" active="profile" onMapClick={() => goto('/discover?view=map')} />

<style>
	.content { width: 100%; max-width: 700px; padding-bottom: 80px; }

	/* Profile header card */
	.profile-card {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 24px;
		margin-bottom: 24px;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link, rgba(0,0,0,0.08));
		border-radius: var(--radius-card, 12px);
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 8px;
		background: var(--bg-control, rgba(0,0,0,0.05));
		border: 1px dashed var(--border-link, rgba(0,0,0,0.15));
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 28px;
		color: var(--text-muted, #999);
		margin-bottom: 12px;
	}

	.profile-name {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.profile-handle {
		font-family: monospace;
		font-size: 0.85rem;
		color: var(--text-muted, #999);
	}

	.profile-stats {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.stat { display: flex; align-items: baseline; gap: 6px; }
	.stat-num { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 1.1rem; font-weight: 500; color: var(--text-primary); }
	.stat-label { font-family: 'SF Mono', monospace; font-size: 0.65rem; letter-spacing: 0.06em; color: var(--text-muted, #999); }

	/* Action card grid */
	.action-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}

	.action-card {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link, rgba(0,0,0,0.08));
		border-radius: var(--radius-card, 12px);
		padding: 20px 16px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		transition: background 0.15s;
		position: relative;
		font-family: 'SangBleu Sunrise', Georgia, serif;
	}

	.action-card:hover { background: var(--bg-control, rgba(0,0,0,0.02)); }

	.card-thumb-stack {
		width: 48px;
		height: 48px;
		position: relative;
	}

	.thumb-placeholder {
		width: 40px;
		height: 48px;
		background: var(--bg-control, rgba(0,0,0,0.06));
		border-radius: 4px;
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.card-label {
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.active-dot {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-success, #3d9e5a);
	}

	.count-badge {
		position: absolute;
		top: 10px;
		right: 10px;
		font-family: 'SF Mono', monospace;
		font-size: 10px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		padding: 1px 5px;
		border-radius: 8px;
	}

	/* Detail views */
	.back-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		color: var(--text-muted, #666);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-bottom: 16px;
	}

	.back-btn:hover { color: var(--text-primary); }

	.view-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.2rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 16px;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 0;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06));
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}

	.list-item:hover { opacity: 0.7; }
	.item-title { flex: 1; font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 0.95rem; color: var(--text-primary); }
	.item-date { font-family: 'SF Mono', monospace; font-size: 11px; color: var(--text-muted, #999); flex-shrink: 0; }

	.badge { font-family: 'SF Mono', monospace; font-size: 10px; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }
	.badge-draft { background: rgba(0,0,0,0.06); color: var(--text-muted, #666); }
	.badge-published { background: rgba(61,158,90,0.12); color: #2d7a42; }
	.badge-archived { background: rgba(0,0,0,0.04); color: var(--text-muted, #999); }
	.badge-pending { background: rgba(245,158,11,0.12); color: #b45309; }
	.badge-accepted { background: rgba(61,158,90,0.12); color: #2d7a42; }

	.empty { font-family: 'SangBleu Sunrise', Georgia, serif; color: var(--text-muted, #999); text-align: center; padding: 32px 0; }
	.empty a { color: var(--text-primary); text-decoration: underline; }
</style>
