<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	const INITIAL_VISIBLE = 5;

	let published = $derived(data.prompts.filter((p: Prompt) => p.state === 'published'));
	let drafts = $derived(data.prompts.filter((p: Prompt) => p.state === 'draft'));
	let archived = $derived(data.prompts.filter((p: Prompt) => p.state === 'archived'));

	// Build unified conversation list sorted by recency
	type ConversationItem = {
		type: 'published' | 'draft' | 'responded' | 'archived';
		id: string;
		title: string;
		coverUrl: string | null;
		href: string;
		sortDate: string;
		meeting?: { id: string; scheduled_time: string; duration_minutes: number; general_area: string | null; partner_username: string };
		authorUsername?: string; // for responded items
	};

	let conversations = $derived.by(() => {
		const items: ConversationItem[] = [];
		const meetingMap = data.meetingsByPromptId ?? {};

		for (const p of published) {
			const m = meetingMap[p.id];
			items.push({
				type: 'published',
				id: p.id,
				title: p.title || copy.common.untitled,
				coverUrl: p.cover_image_url ?? null,
				href: `/conversations/${p.id}`,
				sortDate: p.published_at ?? p.created_at,
				meeting: m ? { id: m.id, scheduled_time: m.scheduled_time, duration_minutes: m.duration_minutes, general_area: m.general_area, partner_username: m.partner_username } : undefined
			});
		}

		for (const p of drafts) {
			items.push({
				type: 'draft',
				id: p.id,
				title: p.title || copy.common.untitled,
				coverUrl: p.cover_image_url ?? null,
				href: `/conversations/${p.id}/edit`,
				sortDate: p.updated_at ?? p.created_at
			});
		}

		for (const rp of data.respondedPrompts) {
			items.push({
				type: 'responded',
				id: rp.prompt_id,
				title: rp.prompt_title,
				coverUrl: rp.prompt_cover_image_url ?? null,
				href: `/conversations/${rp.prompt_id}`,
				sortDate: rp.created_at,
				authorUsername: rp.author_username
			});
		}

		for (const p of archived) {
			items.push({
				type: 'archived',
				id: p.id,
				title: p.title || copy.common.untitled,
				coverUrl: p.cover_image_url ?? null,
				href: `/conversations/${p.id}`,
				sortDate: p.created_at
			});
		}

		// Sort: conversations with meetings first, then by recency
		return items.sort((a, b) => {
			const aHasMeeting = a.meeting ? 0 : 1;
			const bHasMeeting = b.meeting ? 0 : 1;
			if (aHasMeeting !== bHasMeeting) return aHasMeeting - bHasMeeting;
			return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
		});
	});

	let searchOpen = $state(false);
	let searchQuery = $state('');
	let meetingsOnly = $state(false);

	let filteredConversations = $derived(
		conversations
			.filter(c => !meetingsOnly || c.meeting != null)
			.filter(c => !searchQuery.trim() || c.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
	);

	let expanded = $state(false);
	let visibleConversations = $derived(expanded ? filteredConversations : filteredConversations.slice(0, INITIAL_VISIBLE));

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
	<!-- Profile card — clean identity -->
	<div class="profile-card">
		<div class="profile-name">{data.username}</div>
		<div class="profile-handle">@{data.username}</div>
		<a href="/logout" class="sign-out-link">{copy.nav.signOut}</a>
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
						<a href="/conversations/{inv.prompt_id}" class="btn-view">{copy.profile.viewConversation}</a>
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

	<!-- Search input (shown when search is open) -->
	{#if searchOpen}
		<div class="search-bar">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="search-input"
				type="search"
				placeholder="Search your conversations..."
				bind:value={searchQuery}
				autofocus
				oninput={() => expanded = false}
				onblur={() => { if (!searchQuery.trim()) searchOpen = false; }}
			/>
		</div>
	{/if}

	<!-- 2. Unified conversation list with inline meeting context -->
	{#if conversations.length === 0}
		<div class="empty-state">
			<a href="/conversations/new" class="empty-cta">
				<svg width="32" height="32" viewBox="0 0 20 20" fill="none">
					<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
				</svg>
				<span class="empty-cta-text">{copy.profile.startConversation}</span>
			</a>
		</div>
	{:else}
		<div class="conversation-list">
			{#each visibleConversations as item, i}
				<a
					href={item.href}
					class="conv-item"
					class:draft={item.type === 'draft'}
					class:past={item.type === 'archived'}
					style={expanded && i >= INITIAL_VISIBLE ? `animation-delay: ${(i - INITIAL_VISIBLE) * 50}ms` : ''}
					class:fade-in={expanded && i >= INITIAL_VISIBLE}
				>
					<div class="prompt-row">
						<div class="row-thumb">
							{#if item.coverUrl}
								<img src={item.coverUrl} alt="" class="thumb-img" />
							{:else}
								<div class="thumb-placeholder"></div>
							{/if}
						</div>
						<div class="row-body">
							<h3 class="row-title">{item.title}</h3>
							{#if item.type === 'responded' && item.authorUsername}
								<span class="row-status">{copy.profile.respondedTo(item.authorUsername)}</span>
							{:else if item.type === 'draft'}
								<span class="row-status">{copy.status.draft} · {copy.profile.continueEditing}</span>
							{:else if item.type === 'archived'}
								<span class="row-status">{copy.status.archived}</span>
							{:else}
								<span class="row-status">{copy.status.published}</span>
							{/if}
						</div>
					</div>

					<!-- Inline meeting context for published conversations -->
					{#if item.meeting}
						<div class="meeting-inline">
							<span class="meeting-inline-label">{copy.profile.meetingWith(item.meeting.partner_username)}</span>
							<span class="meeting-inline-detail">{formatDate(item.meeting.scheduled_time)} · {formatTime(item.meeting.scheduled_time)} · {item.meeting.duration_minutes} min</span>
							{#if item.meeting.general_area}
								<span class="meeting-inline-area">{item.meeting.general_area}</span>
							{/if}
						</div>
					{/if}
				</a>
			{/each}
		</div>

		{#if filteredConversations.length > INITIAL_VISIBLE && !expanded}
			<button class="see-all-btn" onclick={() => expanded = true}>
				{copy.profile.seeAll(filteredConversations.length)}
			</button>
		{/if}
	{/if}

</div>

<FloatingNav
	variant="profile"
	attentionCount={data.attentionCount}
	onSearchClick={() => { searchOpen = !searchOpen; if (!searchOpen) searchQuery = ''; expanded = false; }}
	onCalendarClick={() => { meetingsOnly = !meetingsOnly; expanded = false; }}
	calendarActive={meetingsOnly}
/>

<style>
	.content { width: 100%; max-width: var(--content-standard); padding-bottom: var(--nav-clearance); }

	/* Profile card — clean identity */
	.profile-card {
		padding: var(--space-6);
		margin-bottom: var(--space-5);
	}

	.profile-name { font-size: var(--text-xl); font-weight: 500; }
	.profile-handle { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-muted); }
	.sign-out-link { font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-2); display: inline-block; }
	.sign-out-link:hover { color: var(--text-primary); }

	/* Sections */
	.profile-section { margin-bottom: var(--space-8); }

	/* Attention cards */
	.attention-card { display: block; padding: var(--space-4); border: 1px solid var(--border-link); border-radius: var(--radius-card); margin-bottom: var(--space-3); color: inherit; transition: opacity 0.15s; }
	.attention-card:hover { opacity: var(--opacity-hover-btn); }
	.attention-who { font-size: var(--text-md); font-weight: 500; display: block; }
	.attention-context { font-size: var(--text-sm); color: var(--text-muted); display: block; }
	.attention-slot { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin: var(--space-2) 0; }
	.attention-message { font-size: var(--text-sm); color: var(--text-secondary); font-style: italic; margin: 0 0 var(--space-3); }
	.attention-actions { display: flex; gap: var(--space-3); align-items: center; margin-top: var(--space-2); }
	.btn-accept { font-size: var(--text-base); padding: var(--space-2) var(--space-5); background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: var(--radius-input); cursor: pointer; }
	.btn-accept:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }
	.btn-view { font-size: var(--text-sm); color: var(--text-muted); }
	.btn-view:hover { color: var(--text-primary); }

	/* Empty state — large inviting CTA */
	.empty-state {
		display: flex;
		justify-content: center;
		padding: var(--space-10) 0;
	}

	.empty-cta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-8) var(--space-10);
		border: 1.5px dashed var(--border-link);
		border-radius: var(--radius-surface);
		color: var(--text-muted);
		transition: border-color 0.15s, color 0.15s;
	}
	.empty-cta:hover { border-color: var(--text-primary); color: var(--text-primary); }
	.empty-cta-text { font-size: var(--text-lg); font-weight: 500; }

	/* Conversation list */
	.conversation-list { display: flex; flex-direction: column; }

	.conv-item { border-bottom: 1px solid var(--border-link); display: block; transition: opacity 0.15s; }
	.conv-item:hover { opacity: var(--opacity-hover-card); }
	.conv-item:last-child { border-bottom: none; }
	.conv-item.draft { opacity: var(--opacity-hover-card); }
	.conv-item.past { opacity: var(--opacity-disabled); }

	/* Staggered fade-in for expanded items */
	.conv-item.fade-in {
		animation: fadeIn 200ms ease-out both;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* .prompt-row, .row-thumb, .thumb-img, .thumb-placeholder, .row-body, .row-title, .row-status — shared.css */

	/* Inline meeting context sub-card */
	.meeting-inline {
		margin: 0 0 var(--space-3);
		margin-left: calc(72px + var(--space-4)); /* align with row-body (thumb width + gap) */
		padding: var(--space-3);
		background: var(--bg-meeting-tint);
		border-radius: var(--radius-input);
	}

	.meeting-inline-label { font-size: var(--text-sm); font-weight: 500; display: block; }
	.meeting-inline-detail { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-top: var(--space-1); }
	.meeting-inline-area { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

	/* Search bar */
	.search-bar {
		margin-bottom: var(--space-4);
	}

	.search-input {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: var(--bg-control);
		border: none;
		border-radius: var(--radius-pill);
		font-family: inherit;
		font-size: var(--text-base);
		color: var(--text-primary);
		outline: none;
	}

	.search-input:focus {
		background: var(--bg-control-hover);
	}

	/* See all button */
	.see-all-btn {
		font-size: var(--text-sm);
		color: var(--text-muted);
		padding: var(--space-3) 0;
		cursor: pointer;
		transition: color 0.15s;
	}
	.see-all-btn:hover { color: var(--text-primary); }

</style>
