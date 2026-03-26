<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import FloatingNav from '$lib/components/FloatingNav.svelte';

	let { data }: { data: PageData } = $props();

	let drafts = $derived(data.prompts.filter((p: Prompt) => p.state === 'draft'));
	let published = $derived(data.prompts.filter((p: Prompt) => p.state === 'published'));
	let archived = $derived(data.prompts.filter((p: Prompt) => p.state === 'archived'));

	// Collect cover images for thumbnail stacks
	let conversationCovers = $derived(
		[...published, ...drafts]
			.map((p: Prompt) => p.cover_image_url)
			.filter((url): url is string => !!url)
			.slice(0, 2)
	);
	let archiveCovers = $derived(
		archived
			.map((p: Prompt) => p.cover_image_url)
			.filter((url): url is string => !!url)
			.slice(0, 2)
	);

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
				<div class="stat"><span class="stat-num">{data.sentInvitations.length}</span><span class="stat-label">SAVED</span></div>
			</div>
		</div>

		<!-- Action card grid -->
		<div class="action-grid">
			<button class="action-card" onclick={() => activeView = 'conversations'}>
				<div class="card-thumb-stack">
					{#if conversationCovers.length >= 2}
						<img src={conversationCovers[1]} alt="" class="thumb-img thumb-back" />
						<img src={conversationCovers[0]} alt="" class="thumb-img thumb-front" />
					{:else if conversationCovers.length === 1}
						<img src={conversationCovers[0]} alt="" class="thumb-img thumb-front" />
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
					{#if archiveCovers.length >= 2}
						<img src={archiveCovers[1]} alt="" class="thumb-img thumb-back" />
						<img src={archiveCovers[0]} alt="" class="thumb-img thumb-front" />
					{:else if archiveCovers.length === 1}
						<img src={archiveCovers[0]} alt="" class="thumb-img thumb-front" />
					{:else}
						<div class="thumb-placeholder"></div>
					{/if}
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
		padding: var(--space-6);
		margin-bottom: var(--space-6);
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-input);
		background: var(--bg-control);
		border: 1px dashed var(--border-link);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		color: var(--text-muted);
		margin-bottom: var(--space-3);
	}

	.profile-name { font-size: var(--text-xl); font-weight: 500; }
	.profile-handle { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-muted); }

	.profile-stats { display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-1); }
	.stat { display: flex; align-items: baseline; gap: var(--space-2); }
	.stat-num { font-size: var(--text-xl); font-weight: 500; }
	.stat-label { font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: 0.06em; color: var(--text-muted); }

	/* Action card grid */
	.action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); }

	.action-card {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		padding: var(--space-5) var(--space-4);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		transition: background 0.15s;
		position: relative;
	}

	.action-card:hover { background: var(--bg-control); }

	/* Stacked thumbnail images */
	.card-thumb-stack { width: 80px; height: 64px; position: relative; }

	.thumb-img {
		position: absolute;
		width: 52px;
		height: 60px;
		object-fit: cover;
		border-radius: var(--radius-input);
		border: 2px solid var(--bg-canvas);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	}

	.thumb-front { top: 2px; left: 50%; transform: translateX(-50%) rotate(-3deg); z-index: 2; }
	.thumb-back { top: 0; left: 50%; transform: translateX(-40%) rotate(5deg); z-index: 1; }

	.thumb-placeholder {
		width: 48px; height: 56px;
		background: var(--bg-control);
		border-radius: var(--radius-input);
		position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
	}

	.card-label { font-size: var(--text-md); }

	.active-dot { position: absolute; top: var(--space-3); right: var(--space-3); width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); }

	.count-badge {
		position: absolute; top: 10px; right: 10px;
		font-family: var(--font-mono); font-size: 10px;
		background: var(--text-primary); color: var(--bg-canvas);
		padding: 1px 5px; border-radius: var(--space-2);
	}

	/* Detail views — .back-btn uses same pattern as global .back-link */
	.back-btn {
		font-size: var(--text-md);
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-bottom: var(--space-4);
	}
	.back-btn:hover { color: var(--text-primary); }

	.view-title { font-size: var(--text-xl); font-weight: normal; margin: 0 0 var(--space-4); }

	.list-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border-link);
		transition: opacity 0.15s;
	}
	.list-item:hover { opacity: 0.7; }
	.item-title { flex: 1; font-size: var(--text-md); }
	.item-date { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); flex-shrink: 0; }

	/* .badge and .badge-* use global shared classes */

	.empty { color: var(--text-muted); text-align: center; padding: var(--space-8) 0; }
	.empty a { text-decoration: underline; }
</style>
