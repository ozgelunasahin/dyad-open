<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConversationCard from '$lib/components/ConversationCard.svelte';
	import MeetingCard from '$lib/components/MeetingCard.svelte';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	// ── Derived lists ───────────────────────────────────────────────────
	let published = $derived(data.prompts.filter((p: Prompt) => p.state === 'published'));
	let drafts = $derived(data.prompts.filter((p: Prompt) => p.state === 'draft'));
	let archived = $derived(data.prompts.filter((p: Prompt) => p.state === 'archived'));

	type ConversationItem = {
		type: 'published' | 'draft' | 'responded' | 'archived';
		id: string;
		title: string;
		coverUrl: string | null;
		href: string;
		sortDate: string;
		meeting?: {
			id: string;
			scheduled_time: string;
			duration_minutes: number;
			general_area: string | null;
			partner_username: string;
			state: string;
		};
		authorUsername?: string;
	};

	/** Started tab: drafts + published (authored by me, excluding archived). */
	let startedConvs = $derived.by(() => {
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
				meeting: m
					? {
							id: m.id,
							scheduled_time: m.scheduled_time,
							duration_minutes: m.duration_minutes,
							general_area: m.general_area,
							partner_username: m.partner_username,
							state: m.state
						}
					: undefined
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

		// Sort: meetings today → upcoming meetings → drafts (recency) → published without meeting → older
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const tomorrow = today + 24 * 60 * 60 * 1000;

		return items.sort((a, b) => {
			const rank = (it: ConversationItem) => {
				if (it.meeting) {
					const mt = new Date(it.meeting.scheduled_time).getTime();
					if (mt >= today && mt < tomorrow) return 0; // today
					if (mt >= tomorrow) return 1; // upcoming
					return 3; // past meetings (below drafts)
				}
				if (it.type === 'draft') return 2;
				return 4; // published without meeting
			};
			const ra = rank(a);
			const rb = rank(b);
			if (ra !== rb) return ra - rb;
			return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
		});
	});

	let respondedConvs = $derived<ConversationItem[]>(
		(data.respondedPrompts ?? []).map((rp) => ({
			type: 'responded',
			id: rp.prompt_id,
			title: rp.prompt_title,
			coverUrl: rp.prompt_cover_image_url ?? null,
			href: `/conversations/${rp.prompt_id}`,
			sortDate: rp.created_at,
			authorUsername: rp.author_username
		}))
	);

	let archivedConvs = $derived<ConversationItem[]>(
		archived.map((p) => ({
			type: 'archived',
			id: p.id,
			title: p.title || copy.common.untitled,
			coverUrl: p.cover_image_url ?? null,
			href: `/conversations/${p.id}`,
			sortDate: p.archived_at ?? p.created_at
		}))
	);

	// ── Tab state ───────────────────────────────────────────────────────
	/**
	 * Default tab: Started, unless the query param pins one. The most-important
	 * view (scheduled meetings + drafts + received invitations) all live under
	 * Started, so that's the right landing tab when there's no explicit signal.
	 */
	let convTab = $derived<'started' | 'responded' | 'archived'>(
		(page.url.searchParams.get('tab') as 'started' | 'responded' | 'archived' | null) ?? 'started'
	);

	function setConvTab(tab: 'started' | 'responded' | 'archived') {
		goto(`/profile?tab=${tab}`, { replaceState: true });
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}
	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
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
		<form method="POST" action="/logout" class="sign-out-form">
			<button type="submit" class="sign-out-link">{copy.nav.signOut}</button>
		</form>
		{#if data.isAdmin}
			<a href="/admin" class="sign-out-link">admin</a>
		{/if}
	</div>

	<!-- Needs your attention — notification surface only, actions happen on conversation detail -->
	{#if data.receivedInvitations.length > 0 || data.feedbackDue.length > 0 || (data.cancelledNotifications?.length ?? 0) > 0}
		<section class="profile-section">
			{#each data.cancelledNotifications ?? [] as cn}
				<div class="attention-card">
					<span class="attention-who">{copy.profile.meetingCancelled}</span>
					<span class="attention-context">
						{copy.profile.meetingCancelledBy(cn.cancelled_by_username)}{#if cn.scheduled_time}
							{' '}on {formatDate(cn.scheduled_time)}{/if}
					</span>
				</div>
			{/each}
			{#each data.receivedInvitations as inv}
				<a href="/conversations/{inv.prompt_id}" class="attention-card link">
					<span class="attention-who">{copy.profile.wantsToMeet(inv.inviter_username)}</span>
					<span class="attention-context">{inv.prompt_title}</span>
					<span class="attention-slot">
						{formatDate(inv.slot_start_time)} · {formatTime(inv.slot_start_time)} · {inv.slot_general_area}
					</span>
					{#if inv.message}
						<p class="attention-message">{inv.message}</p>
					{/if}
					<span class="attention-cta">{copy.profile.viewConversation} →</span>
				</a>
			{/each}
			{#each data.feedbackDue as fb}
				<a href="/feedback/{fb.id}" class="attention-card link">
					<span class="attention-who">{copy.profile.feedbackDue}</span>
					<span class="attention-context">{copy.feedback.howDidItGo}</span>
				</a>
			{/each}
		</section>
	{/if}

	<!-- Tab bar -->
	<div class="tab-bar">
		<button class="tab" class:active={convTab === 'started'} onclick={() => setConvTab('started')}>
			{copy.profile.youStarted}
		</button>
		<button class="tab" class:active={convTab === 'responded'} onclick={() => setConvTab('responded')}>
			{copy.profile.youRespondedTab}
		</button>
		<button class="tab" class:active={convTab === 'archived'} onclick={() => setConvTab('archived')}>
			{copy.profile.archivedTab}
		</button>
	</div>

	{#if convTab === 'started'}
		{#if startedConvs.length === 0}
			<div class="empty-state">
				<a href="/conversations/new" class="empty-cta">
					<svg width="32" height="32" viewBox="0 0 20 20" fill="none">
						<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					<span class="empty-cta-text">{copy.profile.startConversation}</span>
				</a>
			</div>
		{:else}
			<div class="conversation-list">
				{#each startedConvs as item (item.id)}
					<ConversationCard
						variant="profile"
						title={item.title}
						coverUrl={item.coverUrl}
						href={item.href}
						status={item.type === 'draft' ? 'draft' : null}
						dimmed={item.type === 'draft'}
					>
						{#if item.meeting}
							<MeetingCard
								partnerUsername={item.meeting.partner_username}
								scheduledTime={item.meeting.scheduled_time}
								durationMinutes={item.meeting.duration_minutes}
								generalArea={item.meeting.general_area}
								cancelledByUsername={item.meeting.state === 'cancelled_early' || item.meeting.state === 'cancelled_late' ? item.meeting.partner_username : null}
							/>
						{/if}
					</ConversationCard>
				{/each}
			</div>
		{/if}
	{:else if convTab === 'responded'}
		{#if respondedConvs.length === 0}
			<div class="empty-state empty-nudge">
				<p class="empty-text">{copy.profile.emptyResponded}</p>
				<a href="/discover" class="empty-link">{copy.profile.emptyRespondedCta}</a>
			</div>
		{:else}
			<div class="conversation-list">
				{#each respondedConvs as item (item.id)}
					<ConversationCard
						variant="profile"
						title={item.title}
						coverUrl={item.coverUrl}
						href={item.href}
						status="responded"
					/>
				{/each}
			</div>
		{/if}
	{:else}
		{#if archivedConvs.length === 0}
			<div class="empty-state">
				<p class="empty-text">{copy.profile.emptyArchived}</p>
			</div>
		{:else}
			<div class="conversation-list">
				{#each archivedConvs as item (item.id)}
					<ConversationCard
						variant="profile"
						title={item.title}
						coverUrl={item.coverUrl}
						href={item.href}
						status="archived"
						dimmed
					/>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<FloatingNav variant="profile" attentionCount={data.attentionCount} />

<style>
	.content {
		width: 100%;
		max-width: var(--content-standard);
		padding-bottom: var(--nav-clearance);
	}

	/* Profile card — clean identity */
	.profile-card {
		padding: var(--space-6) 0;
		margin-bottom: var(--space-5);
	}

	.profile-name {
		font-size: var(--text-xl);
		font-weight: 500;
	}
	.profile-handle {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.sign-out-form {
		margin: 0;
		padding: 0;
		display: inline-block;
	}
	.sign-out-link {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-top: var(--space-2);
		display: inline-block;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		text-decoration: underline;
		text-decoration-color: transparent;
	}
	.sign-out-link:hover {
		color: var(--text-primary);
	}

	/* Sections */
	.profile-section {
		margin-bottom: var(--space-8);
	}

	/* Attention cards — notification-only, tap to /conversations/[id] */
	.attention-card {
		display: block;
		padding: var(--space-4);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		margin-bottom: var(--space-3);
		color: inherit;
		text-decoration: none;
		transition: opacity 0.15s;
	}
	.attention-card.link:hover {
		opacity: var(--opacity-hover-btn);
	}
	.attention-who {
		font-size: var(--text-md);
		font-weight: 500;
		display: block;
	}
	.attention-context {
		font-size: var(--text-sm);
		color: var(--text-muted);
		display: block;
	}
	.attention-slot {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		display: block;
		margin: var(--space-2) 0;
	}
	.attention-message {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-style: italic;
		margin: 0 0 var(--space-3);
	}
	.attention-cta {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-top: var(--space-2);
		display: inline-block;
	}

	/* Tab bar */
	.tab-bar {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border-bottom: 1px solid var(--border-link);
		margin-bottom: var(--space-4);
	}

	.tab {
		font-size: var(--text-base);
		font-family: inherit;
		color: var(--text-muted);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: var(--space-3) 0;
		margin-bottom: -1px;
		cursor: pointer;
		transition: color 0.15s;
		text-align: center;
	}
	.tab:hover {
		color: var(--text-primary);
	}
	.tab.active {
		color: var(--text-primary);
		font-weight: 600;
		border-bottom-color: var(--text-primary);
	}

	/* Empty states */
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
		transition:
			border-color 0.15s,
			color 0.15s;
	}
	.empty-cta:hover {
		border-color: var(--text-primary);
		color: var(--text-primary);
	}
	.empty-cta-text {
		font-size: var(--text-lg);
		font-weight: 500;
	}

	.empty-nudge {
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-10) var(--space-6);
	}

	.empty-text {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0;
	}

	.empty-link {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-decoration: underline;
		text-decoration-color: var(--border-link);
		transition:
			color 0.15s,
			text-decoration-color 0.15s;
	}
	.empty-link:hover {
		color: var(--text-primary);
		text-decoration-color: currentColor;
	}

	/* Conversation list */
	.conversation-list {
		display: flex;
		flex-direction: column;
	}
</style>
