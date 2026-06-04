<script lang="ts">
	import type { PageData } from './$types';
	import type { Prompt } from '$lib/domain/types';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConversationCard from '$lib/components/ConversationCard.svelte';
	import SlotCard from '$lib/components/SlotCard.svelte';
	import ParticipantsStack from '$lib/components/ParticipantsStack.svelte';
	import { copy } from '$lib/copy';
	import { formatRelativePast, formatShortDate as formatDate } from '$lib/utils/dates';

	let { data }: { data: PageData } = $props();

	// Unseen-response tracking is intentionally kept in the data model (via
	// localStorage) even though we don't surface it as a visible dot — dots
	// were too anxiety-inducing. The signal is available if we later want to
	// use it for sorting (unseen first), a quieter tint, or a dedicated view.
	const SEEN_KEY = 'dyad_seen_response_counts';
	function loadSeenMap(): Record<string, number> {
		if (!browser) return {};
		try {
			const raw = localStorage.getItem(SEEN_KEY);
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	}
	function isUnseen(promptId: string, currentCount: number): boolean {
		if (!browser || currentCount === 0) return false;
		const seen = loadSeenMap()[promptId] ?? 0;
		return currentCount > seen;
	}
	function markSeen(promptId: string) {
		if (!browser) return;
		const current = data.responseCountByPromptId?.[promptId] ?? 0;
		const map = loadSeenMap();
		map[promptId] = current;
		try {
			localStorage.setItem(SEEN_KEY, JSON.stringify(map));
		} catch {
			// localStorage quota / private mode — silently ignore.
		}
	}

	function responseCountLabel(n: number): string {
		return n === 0 ? '' : copy.profile.responseCount(n);
	}
	function meetingCountLabel(n: number): string {
		return n === 0 ? '' : copy.profile.meetingCount(n);
	}
	function invitationStateLabel(state: string | undefined, authorUsername: string): string | null {
		if (!state) return null;
		if (state === 'pending') return copy.profile.invitedWaiting(authorUsername);
		if (state === 'declined') return copy.profile.invitationDeclined;
		if (state === 'expired') return copy.profile.invitationExpired;
		// 'accepted' handled by the gathering card — no status line needed.
		return null;
	}

	type MeetingSnapshot = { scheduled_time: string; duration_minutes: number; state: string };
	function meetingIsDone(m: MeetingSnapshot): boolean {
		if (m.state === 'cancelled_early' || m.state === 'cancelled_late') return true;
		if (m.state === 'completed' || m.state === 'awaiting_feedback') return true;
		// Scheduled but already in the past (end time has passed).
		const endMs = new Date(m.scheduled_time).getTime() + m.duration_minutes * 60_000;
		return endMs < Date.now();
	}

	/** Shared tab sort: items with upcoming meetings first (soonest-first),
	 *  everything else by sortDate descending (most recent activity). */
	function byMeetingThenRecency(a: ConversationItem, b: ConversationItem): number {
		const aMeet = a.meeting ? new Date(a.meeting.scheduled_time).getTime() : Infinity;
		const bMeet = b.meeting ? new Date(b.meeting.scheduled_time).getTime() : Infinity;
		if (aMeet !== bMeet) return aMeet - bMeet;
		return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
	}

	// ── Derived lists ───────────────────────────────────────────────────
	// "Started" tab: published with ≥1 future-valid slot, plus drafts.
	// "Archive" tab: published with no future-valid slots (derived from slot
	// data, not a state column — there's no archived state on the prompt).
	let published = $derived(
		data.prompts.filter(
			(p: Prompt) => p.state === 'published' && data.hasFutureValidSlotByPromptId?.[p.id]
		)
	);
	let drafts = $derived(data.prompts.filter((p: Prompt) => p.state === 'draft'));
	let archived = $derived(
		data.prompts.filter(
			(p: Prompt) => p.state === 'published' && !data.hasFutureValidSlotByPromptId?.[p.id]
		)
	);

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
			partner_usernames: string[];
			anonymous_count: number;
			exact_location: { place_id: string; name: string; address: string; lat: number; lng: number } | null;
			state: string;
			cancelled_by_me: boolean;
			cancelled_by_username: string | null;
		};
		authorUsername?: string;
		statusText?: string | null;
		unseen?: boolean;
	};

	// Per-prompt active meeting for profile cards — skip meetings that are
	// cancelled or past-took-place, since neither belongs on a "what's live" card.
	// A conversation isn't "done" because one meeting happened or was cancelled —
	// authors can keep opening new slots on the same prompt.
	function activeMeetingFor(promptId: string) {
		const m = (data.meetingsByPromptId ?? {})[promptId];
		if (!m) return undefined;
		const cancelled = m.state === 'cancelled_early' || m.state === 'cancelled_late';
		if (cancelled) return undefined;
		if (meetingIsDone(m)) return undefined;
		return {
			id: m.id,
			scheduled_time: m.scheduled_time,
			duration_minutes: m.duration_minutes,
			general_area: m.general_area,
			partner_username: m.partner_username,
			partner_usernames: m.partner_usernames ?? [m.partner_username],
			anonymous_count: m.anonymous_count ?? 0,
			exact_location: m.exact_location ?? null,
			state: m.state,
			cancelled_by_me: m.cancelled_by_me,
			cancelled_by_username: m.cancelled_by_username
		};
	}

	/** Started tab: drafts + authored published, in live shape. Past meetings
	 *  stay with the conversation (and are surfaced in Archive as a record),
	 *  not an excuse to retire it. */
	let startedConvs = $derived.by<ConversationItem[]>(() => {
		const items: ConversationItem[] = [];
		for (const p of published) {
			const responseCount = data.responseCountByPromptId?.[p.id] ?? 0;
			items.push({
				type: 'published',
				id: p.id,
				title: p.title || copy.common.untitled,
				coverUrl: p.cover_image_url ?? null,
				href: `/conversations/${p.id}`,
				sortDate: p.published_at ?? p.created_at,
				statusText: responseCountLabel(responseCount) || null,
				unseen: isUnseen(p.id, responseCount),
				meeting: activeMeetingFor(p.id)
			});
		}
		for (const p of drafts) {
			const edited = p.updated_at ?? p.created_at;
			items.push({
				type: 'draft',
				id: p.id,
				title: p.title || copy.common.untitled,
				coverUrl: p.cover_image_url ?? null,
				href: `/conversations/${p.id}/edit`,
				sortDate: edited,
				statusText: edited ? `edited ${formatRelativePast(edited)}` : null
			});
		}
		// Started tab order (drafts-first to encourage completion):
		//   1. drafts (most-recently-edited first)
		//   2. meetings today
		//   3. upcoming meetings (soonest first)
		//   4. published without meeting (recency)
		return items.sort((a, b) => {
			const rank = (it: ConversationItem) => {
				if (it.type === 'draft') return 0;
				if (it.meeting) {
					const mt = new Date(it.meeting.scheduled_time).getTime();
					const now = Date.now();
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					const tomorrow = today.getTime() + 24 * 60 * 60 * 1000;
					if (mt >= today.getTime() && mt < tomorrow) return 1;
					if (mt >= now) return 2;
					return 4;
				}
				return 3;
			};
			const ra = rank(a);
			const rb = rank(b);
			if (ra !== rb) return ra - rb;
			if (a.meeting && b.meeting) {
				return new Date(a.meeting.scheduled_time).getTime() - new Date(b.meeting.scheduled_time).getTime();
			}
			return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
		});
	});

	let respondedConvs = $derived<ConversationItem[]>(
		(data.respondedPrompts ?? [])
			.map((rp) => {
				const invState = data.myInvitationStateByPromptId?.[rp.prompt_id];
				const inviteLabel = invState ? invitationStateLabel(invState, rp.author_username) : null;
				const respondedLabel = rp.created_at ? `responded ${formatRelativePast(rp.created_at)}` : null;
				return {
					type: 'responded',
					id: rp.prompt_id,
					title: rp.prompt_title,
					coverUrl: rp.prompt_cover_image_url ?? null,
					href: `/conversations/${rp.prompt_id}`,
					sortDate: rp.created_at,
					authorUsername: rp.author_username,
					statusText: inviteLabel ?? respondedLabel,
					meeting: activeMeetingFor(rp.prompt_id)
				} as ConversationItem;
			})
			.sort(byMeetingThenRecency)
	);

	/** Archive tab: prompts that are no longer active (manually archived, or
	 *  auto-archived by the 7-day rolling-window rule server-side). Past
	 *  meetings live with their parent conversation — clickable through the
	 *  conversation card, not re-surfaced here as standalone records. */
	let archivedConvs = $derived<ConversationItem[]>(
		archived
			.map((p) => {
				const count = data.meetingCountByPromptId?.[p.id] ?? 0;
				return {
					type: 'archived',
					id: p.id,
					title: p.title || copy.common.untitled,
					coverUrl: p.cover_image_url ?? null,
					href: `/conversations/${p.id}`,
					sortDate: p.published_at ?? p.created_at,
					statusText: meetingCountLabel(count) || null
				} as ConversationItem;
			})
			.sort(byMeetingThenRecency)
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
	</div>

	<!-- Needs your attention — notification surface only, actions happen on conversation detail -->
	{#if data.receivedInvitations.length > 0 || data.feedbackDue.length > 0 || (data.cancelledNotifications?.length ?? 0) > 0}
		<section class="profile-section">
			{#each data.cancelledNotifications ?? [] as cn}
				{#if cn.meeting_id}
					<a href="/meetings/{cn.meeting_id}" class="attention-card link">
						<span class="attention-who">{copy.profile.meetingCancelled}</span>
						<span class="attention-context">
							{cn.scheduled_time
								? copy.profile.cancellationAttention(cn.cancelled_by_username, formatDate(cn.scheduled_time))
								: copy.profile.meetingCancelledBy(cn.cancelled_by_username)}
						</span>
						{#if cn.reason}
							<blockquote class="cancellation-reason">{cn.reason}</blockquote>
						{/if}
					</a>
				{:else}
					<div class="attention-card">
						<span class="attention-who">{copy.profile.meetingCancelled}</span>
						<span class="attention-context">
							{cn.scheduled_time
								? copy.profile.cancellationAttention(cn.cancelled_by_username, formatDate(cn.scheduled_time))
								: copy.profile.meetingCancelledBy(cn.cancelled_by_username)}
						</span>
						{#if cn.reason}
							<blockquote class="cancellation-reason">{cn.reason}</blockquote>
						{/if}
					</div>
				{/if}
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
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div onclick={item.type === 'published' ? () => markSeen(item.id) : undefined}>
						<ConversationCard
							variant="profile"
							title={item.title}
							coverUrl={item.coverUrl}
							href={item.href}
							statusText={item.statusText ?? null}
							status={item.type === 'draft' && !item.statusText ? 'draft' : null}
							dimmed={item.type === 'draft'}
						>
							{#if item.meeting}
								{@const isCancelled = item.meeting.state === 'cancelled_early' || item.meeting.state === 'cancelled_late'}
								<SlotCard
									tone="meeting"
									startTime={item.meeting.scheduled_time}
									durationMinutes={item.meeting.duration_minutes}
									area={item.meeting.general_area ?? ''}
									exactLocation={item.meeting.exact_location}
									cancelledByMe={isCancelled && item.meeting.cancelled_by_me}
									cancelledByUsername={isCancelled && !item.meeting.cancelled_by_me ? (item.meeting.cancelled_by_username ?? item.meeting.partner_username) : null}
								>
									<ParticipantsStack
										self={{ name: data.username || 'you' }}
										participants={item.meeting.partner_usernames.map((name) => ({ id: name, name }))}
										anonymousCount={item.meeting.anonymous_count}
									/>
								</SlotCard>
							{/if}
						</ConversationCard>
					</div>
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
						authorUsername={item.authorUsername ?? null}
						statusText={item.statusText ?? null}
					>
						{#if item.meeting}
							{@const isCancelled = item.meeting.state === 'cancelled_early' || item.meeting.state === 'cancelled_late'}
							<SlotCard
								tone="meeting"
								startTime={item.meeting.scheduled_time}
								durationMinutes={item.meeting.duration_minutes}
								area={item.meeting.general_area ?? ''}
								exactLocation={item.meeting.exact_location}
								cancelledByMe={isCancelled && item.meeting.cancelled_by_me}
								cancelledByUsername={isCancelled && !item.meeting.cancelled_by_me ? (item.meeting.cancelled_by_username ?? item.meeting.partner_username) : null}
							>
								<ParticipantsStack
									self={{ name: data.username || 'you' }}
									participants={item.meeting.partner_usernames.map((name) => ({ id: name, name }))}
									anonymousCount={item.meeting.anonymous_count}
								/>
							</SlotCard>
						{/if}
					</ConversationCard>
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
						statusText={item.statusText ?? null}
						status={item.statusText ? null : 'archived'}
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
	.cancellation-reason {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-style: italic;
		line-height: var(--leading-relaxed);
		margin: var(--space-2) 0 0;
		padding: 0;
		border: none;
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
