<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import { copy } from '$lib/copy';

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

	// Cover images for the stacked card previews
	let conversationCovers = $derived(
		[...published, ...drafts].filter(p => p.cover_image_url).slice(0, 2)
	);
	let allConversations = $derived([...published, ...drafts, ...data.respondedPrompts, ...archived]);
	let allMeetings = $derived([...upcomingMeetings, ...pastMeetings]);

	// Expanded section state (null = show card grid)
	let expandedSection = $state<'conversations' | 'meetings' | null>(null);

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
</script>

<svelte:head>
	<title>Profile - dyad.berlin</title>
</svelte:head>

<div class="content">
	<!-- Profile card -->
	<div class="profile-card">
		<div class="profile-card-left">
			<div class="profile-name">{data.username}</div>
			<div class="profile-handle">@{data.username}</div>
		</div>
		<div class="profile-card-right">
			<div class="stat">
				<span class="stat-num">{published.length}</span>
				<span class="stat-label">Active</span>
			</div>
			<div class="stat">
				<span class="stat-num">{upcomingMeetings.length}</span>
				<span class="stat-label">Meetings</span>
			</div>
		</div>
	</div>

	<!-- 1. Needs your attention -->
	{#if data.receivedInvitations.length > 0 || data.feedbackDue.length > 0 || (data.cancelledNotifications?.length ?? 0) > 0}
		<section class="profile-section">
			{#each data.cancelledNotifications ?? [] as cn}
				<div class="attention-card">
					<span class="attention-who">{copy.profile.meetingCancelled}</span>
					<span class="attention-context">{copy.profile.meetingCancelledBy(cn.cancelled_by_username)}{#if cn.scheduled_time} on {formatDate(cn.scheduled_time)}{/if}</span>
				</div>
			{/each}
			{#each data.receivedInvitations as inv}
				<div class="attention-card">
					<span class="attention-who">{copy.profile.wantsToMeet(inv.inviter_username)}</span>
					<span class="attention-context">{inv.prompt_title}</span>
					<span class="attention-slot">{formatDate(inv.slot_start_time)} · {formatTime(inv.slot_start_time)} · {inv.slot_general_area}</span>
					{#if inv.message}
						<p class="attention-message">{inv.message}</p>
					{/if}
					<div class="attention-actions">
						<button class="btn-accept" onclick={() => acceptInvitation(inv.id)} disabled={acceptingId === inv.id}>
							{acceptingId === inv.id ? copy.common.accepting : copy.common.accept}
						</button>
						<a href="/conversations/{inv.prompt_id}?from=profile" class="btn-view">View conversation</a>
					</div>
				</div>
			{/each}
			{#each data.feedbackDue as fb}
				<a href="/feedback/{fb.id}" class="attention-card">
					<span class="attention-who">{copy.profile.feedbackDue}</span>
					<span class="attention-context">{copy.feedback.howDidItGo}</span>
				</a>
			{/each}
			{#if acceptError}<p class="field-error">{acceptError}</p>{/if}
		</section>
	{/if}

	<!-- 2. Action card grid OR expanded section -->
	{#if expandedSection === null}
		<div class="action-cards">
			<button class="action-card" onclick={() => expandedSection = 'conversations'}>
				<div class="card-covers">
					{#if allConversations.length > 0}
						<span class="action-card-badge"></span>
					{/if}
					{#if conversationCovers.length >= 2}
						<img src={conversationCovers[0].cover_image_url} alt="" class="card-cover back" />
						<img src={conversationCovers[1].cover_image_url} alt="" class="card-cover front" />
					{:else if conversationCovers.length === 1}
						<img src={conversationCovers[0].cover_image_url} alt="" class="card-cover single" />
					{:else}
						<div class="card-cover-empty"></div>
					{/if}
				</div>
				<span class="action-card-label">{copy.profile.conversations}</span>
			</button>

			<button class="action-card" onclick={() => expandedSection = 'meetings'}>
				<div class="card-covers">
					{#if upcomingMeetings.length > 0}
						<span class="action-card-badge pulse"></span>
					{/if}
					<div class="card-cover-empty"></div>
				</div>
				<span class="action-card-label">{copy.profile.meetings}</span>
				{#if allMeetings.length > 0}
					<span class="action-card-count">{allMeetings.length}</span>
				{/if}
			</button>
		</div>

	{:else if expandedSection === 'conversations'}
		<section class="expanded-section">
			<button class="back-section-btn" onclick={() => expandedSection = null}>
				← {copy.profile.conversations}
			</button>

			{#if allConversations.length === 0}
				<p class="empty">{copy.profile.noConversations} <a href="/conversations/new">{copy.profile.startOne}</a></p>
			{:else}
				<div class="prompt-list">
					{#each published as prompt}
						<a href="/conversations/{prompt.id}?from=profile" class="prompt-item">
							<div class="prompt-row">
								<div class="row-thumb">
									{#if prompt.cover_image_url}
										<img src={prompt.cover_image_url} alt="" class="thumb-img" />
									{:else}
										<div class="thumb-placeholder"></div>
									{/if}
								</div>
								<div class="row-body">
									<h3 class="row-title">{prompt.title || copy.common.untitled}</h3>
									<span class="row-status">{copy.status.published}</span>
								</div>
							</div>
						</a>
					{/each}

					{#each drafts as prompt}
						<a href="/conversations/{prompt.id}/edit" class="prompt-item draft">
							<div class="prompt-row">
								<div class="row-thumb">
									{#if prompt.cover_image_url}
										<img src={prompt.cover_image_url} alt="" class="thumb-img" />
									{:else}
										<div class="thumb-placeholder"></div>
									{/if}
								</div>
								<div class="row-body">
									<h3 class="row-title">{prompt.title || copy.common.untitled}</h3>
									<span class="row-status">{copy.status.draft}</span>
								</div>
							</div>
						</a>
					{/each}

					{#each data.respondedPrompts as rp}
						<a href="/conversations/{rp.prompt_id}?from=profile" class="prompt-item">
							<div class="prompt-row">
								<div class="row-thumb">
									<div class="thumb-placeholder"></div>
								</div>
								<div class="row-body">
									<h3 class="row-title">{rp.prompt_title}</h3>
									<span class="row-status">{copy.status.responded}</span>
								</div>
							</div>
						</a>
					{/each}

					{#each archived as prompt}
						<a href="/conversations/{prompt.id}" class="prompt-item past">
							<div class="prompt-row">
								<div class="row-thumb">
									{#if prompt.cover_image_url}
										<img src={prompt.cover_image_url} alt="" class="thumb-img" />
									{:else}
										<div class="thumb-placeholder"></div>
									{/if}
								</div>
								<div class="row-body">
									<h3 class="row-title">{prompt.title || copy.common.untitled}</h3>
									<span class="row-status">{copy.status.archived}</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>

	{:else if expandedSection === 'meetings'}
		<section class="expanded-section">
			<button class="back-section-btn" onclick={() => expandedSection = null}>
				← {copy.profile.meetings}
			</button>

			{#if allMeetings.length === 0}
				<p class="empty">{copy.profile.noMeetings}</p>
			{:else}
				{#each upcomingMeetings as meeting}
					<a href="/meetings/{meeting.id}?from=profile" class="meeting-row">
						<div class="meeting-when">{formatDate(meeting.scheduled_time)} · {formatTime(meeting.scheduled_time)}</div>
						<div class="meeting-details">{meeting.duration_minutes} min · {meeting.general_area}</div>
					</a>
				{/each}
				{#each pastMeetings as meeting}
					<a href="/meetings/{meeting.id}?from=profile" class="meeting-row past">
						<div class="meeting-when">{formatDate(meeting.scheduled_time)}</div>
						<div class="meeting-details">Past</div>
					</a>
				{/each}
			{/if}
		</section>
	{/if}

	<div class="sign-out-section">
		<a href="/logout" class="sign-out-link">{copy.nav.signOut}</a>
	</div>
</div>

<FloatingNav variant="default" attentionCount={data.attentionCount ?? 0} />

<style>
	.content { width: 100%; max-width: 700px; padding-bottom: 80px; }

	/* Profile card */
	.profile-card {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: var(--space-6);
		background: rgba(245, 244, 240, 0.7);
		border-radius: 20px;
		margin-bottom: var(--space-5);
	}

	.profile-card-left { display: flex; flex-direction: column; }

	.profile-name { font-size: var(--text-xl); font-weight: 600; }
	.profile-handle { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-muted); }

	.profile-card-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-2);
	}

	.stat { text-align: right; }
	.stat-num { font-size: var(--text-2xl); font-weight: 600; display: block; line-height: 1.1; }
	.stat-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

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

	/* === Action card grid (Airbnb-style stacked covers) === */
	.action-cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		padding: 4px 0 16px;
	}

	.action-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px 12px 16px;
		background: rgba(245, 244, 240, 0.7);
		border: none;
		border-radius: 20px;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.2s, transform 0.15s;
	}

	.action-card:hover {
		background: rgba(240, 238, 232, 0.9);
		transform: translateY(-1px);
	}

	.action-card-count {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.card-covers {
		position: relative;
		width: 80px;
		height: 72px;
	}

	.card-cover {
		position: absolute;
		width: 56px;
		height: 56px;
		object-fit: cover;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	}

	.card-cover.back { left: 0; top: 6px; transform: rotate(-6deg); z-index: 1; }
	.card-cover.front { right: 0; top: 0; transform: rotate(4deg); z-index: 2; }
	.card-cover.single { left: 50%; top: 0; transform: translateX(-50%); }

	.card-cover-empty {
		width: 56px;
		height: 56px;
		border-radius: 8px;
		background: var(--bg-control, rgba(0, 0, 0, 0.06));
		margin: 0 auto;
	}

	.action-card-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		z-index: 3;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-success, #22c55e);
	}

	.action-card-badge.pulse {
		animation: badge-pulse 2s ease-in-out infinite;
	}

	@keyframes badge-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
		50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
	}

	.action-card-label {
		font-size: var(--text-sm);
		color: var(--text-primary);
		font-weight: 500;
	}

	/* === Expanded section === */
	.expanded-section { margin-bottom: var(--space-8); }

	.back-section-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-md);
		font-weight: 500;
		color: var(--text-primary);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-bottom: var(--space-6);
	}
	.back-section-btn:hover { opacity: 0.7; }

	/* Meeting rows */
	.meeting-row { display: block; padding: var(--space-4); border: 1px solid var(--border-link); border-radius: var(--radius-card); margin-bottom: var(--space-3); transition: opacity 0.15s; }
	.meeting-row:hover { opacity: 0.85; }
	.meeting-row.past { opacity: 0.5; }
	.meeting-when { font-size: var(--text-md); font-weight: 500; }
	.meeting-details { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); }

	/* Conversation list (expanded view) */
	.prompt-list { display: flex; flex-direction: column; }

	.prompt-item { border-bottom: 1px solid var(--border-link); display: block; transition: opacity 0.15s; }
	.prompt-item:hover { opacity: 0.72; }
	.prompt-item:last-child { border-bottom: none; }
	.prompt-item.draft { opacity: 0.7; }
	.prompt-item.past { opacity: 0.5; }

	.prompt-row { display: flex; gap: var(--space-4); padding: var(--space-4) 0; align-items: stretch; }

	.row-thumb { position: relative; flex-shrink: 0; width: 72px; min-height: 72px; border-radius: var(--radius-input); overflow: hidden; }
	.thumb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.thumb-placeholder { position: absolute; inset: 0; background: var(--bg-control); border-radius: inherit; }

	.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
	.row-title { margin: 0 0 var(--space-1); font-size: var(--text-md); font-weight: 500; line-height: var(--leading-tight); }
	.row-status { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

	.empty { color: var(--text-muted); padding: var(--space-6) 0; }
	.empty a { text-decoration: underline; }

	/* Mobile: top padding for FloatingNav */
	@media (max-width: 768px) { .content { padding-top: 64px; } }

	.sign-out-section { padding: var(--space-8) 0 var(--space-4); text-align: center; }
	.sign-out-link { font-size: var(--text-sm); color: var(--text-muted); min-height: 44px; display: inline-flex; align-items: center; }
	.sign-out-link:hover { color: var(--text-primary); }
</style>
