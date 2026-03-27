<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import FloatingNav from '$lib/components/FloatingNav.svelte';

	let { data }: { data: PageData } = $props();

	let published = $derived(data.prompts.filter((p: Prompt) => p.state === 'published'));
	let drafts = $derived(data.prompts.filter((p: Prompt) => p.state === 'draft'));
	let archived = $derived(data.prompts.filter((p: Prompt) => p.state === 'archived'));

	let upcomingMeetings = $derived(
		data.meetings.filter(m => new Date(m.scheduled_time) > new Date())
			.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
	);
	let pastMeetings = $derived(
		data.meetings.filter(m => new Date(m.scheduled_time) <= new Date())
			.sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime())
	);

	let acceptingId = $state<string | null>(null);
	let acceptError = $state('');

	async function acceptInvitation(invitationId: string) {
		acceptingId = invitationId;
		acceptError = '';
		try {
			const res = await fetch(`/api/invitations/${invitationId}/accept`, { method: 'POST' });
			if (res.ok) {
				const { meetingId } = await res.json();
				goto(`/meetings/${meetingId}`);
			} else {
				const err = await res.json().catch(() => ({}));
				acceptError = (err as any).error ?? 'Failed to accept';
			}
		} catch {
			acceptError = 'Network error';
		} finally {
			acceptingId = null;
		}
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function promptStatus(prompt: Prompt): string {
		if (prompt.state === 'draft') return 'Draft';
		if (prompt.state === 'archived') return 'Archived';
		return 'Published';
	}
</script>

<svelte:head>
	<title>Profile - dyad.berlin</title>
</svelte:head>

<div class="content">
	<!-- Profile header -->
	<div class="profile-header">
		<div class="avatar">{(data.username ?? 'U')[0].toUpperCase()}</div>
		<div>
			<div class="profile-name">{data.username}</div>
			<div class="profile-handle">@{data.username}</div>
		</div>
	</div>

	<!-- 1. Needs your attention -->
	{#if data.receivedInvitations.length > 0 || data.feedbackDue.length > 0}
		<section class="profile-section">
			{#each data.receivedInvitations as inv}
				<div class="attention-card">
					<span class="attention-who">@{inv.inviter_username} wants to meet</span>
					<span class="attention-context">{inv.prompt_title}</span>
					<span class="attention-slot">{formatDate(inv.slot_start_time)} · {formatTime(inv.slot_start_time)} · {inv.slot_general_area}</span>
					{#if inv.message}
						<p class="attention-message">{inv.message}</p>
					{/if}
					<div class="attention-actions">
						<button class="btn-accept" onclick={() => acceptInvitation(inv.id)} disabled={acceptingId === inv.id}>
							{acceptingId === inv.id ? 'Accepting...' : 'Accept'}
						</button>
						<a href="/prompts/{inv.prompt_id}?from=profile" class="btn-view">View conversation</a>
					</div>
				</div>
			{/each}
			{#each data.feedbackDue as fb}
				<a href="/feedback/{fb.id}" class="attention-card">
					<span class="attention-who">Feedback due</span>
					<span class="attention-context">How did your meeting go?</span>
				</a>
			{/each}
			{#if acceptError}<p class="field-error">{acceptError}</p>{/if}
		</section>
	{/if}

	<!-- 2. Meetings -->
	{#if upcomingMeetings.length > 0 || pastMeetings.length > 0}
		<section class="profile-section">
			<h2 class="section-title">Meetings</h2>
			{#each upcomingMeetings as meeting}
				<a href="/meetings/{meeting.id}?from=profile" class="meeting-row">
					<div class="meeting-when">{formatDate(meeting.scheduled_time)} · {formatTime(meeting.scheduled_time)}</div>
					<div class="meeting-details">{meeting.duration_minutes} min · {meeting.general_area ?? 'TBD'}</div>
				</a>
			{/each}
			{#each pastMeetings as meeting}
				<a href="/meetings/{meeting.id}?from=profile" class="meeting-row past">
					<div class="meeting-when">{formatDate(meeting.scheduled_time)}</div>
					<div class="meeting-details">Past</div>
				</a>
			{/each}
		</section>
	{/if}

	<!-- 3. Conversations (reuses discover card pattern) -->
	<section class="profile-section">
		<h2 class="section-title">Conversations</h2>

		{#if published.length === 0 && drafts.length === 0 && data.respondedPrompts.length === 0 && archived.length === 0}
			<p class="empty">No conversations yet. <a href="/prompts/new">Start one</a></p>
		{:else}
			<div class="prompt-list">
				{#each published as prompt}
					<a href="/prompts/{prompt.id}?from=profile" class="prompt-item">
						<div class="prompt-row">
							<div class="row-thumb">
								{#if prompt.cover_image_url}
									<img src={prompt.cover_image_url} alt="" class="thumb-img" />
								{:else}
									<div class="thumb-placeholder"></div>
								{/if}
							</div>
							<div class="row-body">
								<h3 class="row-title">{prompt.title || 'Untitled'}</h3>
								<span class="row-status">Published</span>
							</div>
						</div>
					</a>
				{/each}

				{#each drafts as prompt}
					<a href="/prompts/{prompt.id}/edit" class="prompt-item draft">
						<div class="prompt-row">
							<div class="row-thumb">
								{#if prompt.cover_image_url}
									<img src={prompt.cover_image_url} alt="" class="thumb-img" />
								{:else}
									<div class="thumb-placeholder"></div>
								{/if}
							</div>
							<div class="row-body">
								<h3 class="row-title">{prompt.title || 'Untitled'}</h3>
								<span class="row-status">Draft</span>
							</div>
						</div>
					</a>
				{/each}

				{#each data.respondedPrompts as rp}
					<a href="/prompts/{rp.prompt_id}?from=profile" class="prompt-item">
						<div class="prompt-row">
							<div class="row-thumb">
								<div class="thumb-placeholder"></div>
							</div>
							<div class="row-body">
								<h3 class="row-title">{rp.prompt_title}</h3>
								<span class="row-status">Responded</span>
							</div>
						</div>
					</a>
				{/each}

				{#each archived as prompt}
					<a href="/prompts/{prompt.id}" class="prompt-item past">
						<div class="prompt-row">
							<div class="row-thumb">
								{#if prompt.cover_image_url}
									<img src={prompt.cover_image_url} alt="" class="thumb-img" />
								{:else}
									<div class="thumb-placeholder"></div>
								{/if}
							</div>
							<div class="row-body">
								<h3 class="row-title">{prompt.title || 'Untitled'}</h3>
								<span class="row-status">Archived</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</div>

<FloatingNav position="bottom" active="profile" onMapClick={() => goto('/discover?view=map')} />

<style>
	.content { width: 100%; max-width: 700px; padding-bottom: 80px; }

	/* Profile header */
	.profile-header { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-8); }
	.avatar { width: 56px; height: 56px; border-radius: var(--radius-input); background: var(--bg-control); display: flex; align-items: center; justify-content: center; font-size: 22px; color: var(--text-muted); flex-shrink: 0; }
	.profile-name { font-size: var(--text-xl); font-weight: 500; }
	.profile-handle { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-muted); }

	/* Sections */
	.profile-section { margin-bottom: var(--space-8); }

	/* Attention cards */
	.attention-card { display: block; padding: var(--space-4); border: 1px solid var(--border-link); border-radius: var(--radius-card); margin-bottom: var(--space-3); color: inherit; transition: opacity 0.15s; }
	.attention-card:hover { opacity: 0.85; }
	.attention-who { font-size: var(--text-md); font-weight: 500; display: block; }
	.attention-context { font-size: var(--text-sm); color: var(--text-muted); display: block; }
	.attention-slot { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin: var(--space-2) 0; }
	.attention-message { font-size: var(--text-sm); color: var(--text-secondary); font-style: italic; margin: 0 0 var(--space-3); }
	.attention-actions { display: flex; gap: var(--space-3); align-items: center; margin-top: var(--space-2); }
	.btn-accept { font-size: var(--text-base); padding: var(--space-2) var(--space-5); background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: var(--radius-input); cursor: pointer; }
	.btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-view { font-size: var(--text-sm); color: var(--text-muted); }
	.btn-view:hover { color: var(--text-primary); }

	/* Meeting rows — their own display language */
	.meeting-row { display: block; padding: var(--space-4); border: 1px solid var(--border-link); border-radius: var(--radius-card); margin-bottom: var(--space-3); transition: opacity 0.15s; }
	.meeting-row:hover { opacity: 0.85; }
	.meeting-row.past { opacity: 0.5; }
	.meeting-when { font-size: var(--text-md); font-weight: 500; }
	.meeting-details { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); }

	/* Conversation cards — reuses discover row pattern */
	.prompt-list { display: flex; flex-direction: column; }

	.prompt-item { border-bottom: 1px solid var(--border-link); display: block; transition: opacity 0.15s; }
	.prompt-item:hover { opacity: 0.72; }
	.prompt-item:last-child { border-bottom: none; }
	.prompt-item.draft { opacity: 0.7; }
	.prompt-item.past { opacity: 0.5; }

	.prompt-row { display: flex; gap: var(--space-4); padding: var(--space-4) 0; align-items: stretch; }

	.row-thumb { position: relative; flex-shrink: 0; width: 72px; min-height: 72px; border-radius: var(--radius-input); overflow: hidden; }
	.thumb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.thumb-placeholder { position: absolute; inset: 0; background: var(--bg-control); }

	.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
	.row-title { margin: 0 0 var(--space-1); font-size: var(--text-md); font-weight: 500; line-height: var(--leading-tight); }
	.row-status { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

	.empty { color: var(--text-muted); padding: var(--space-6) 0; }
	.empty a { text-decoration: underline; }
</style>
