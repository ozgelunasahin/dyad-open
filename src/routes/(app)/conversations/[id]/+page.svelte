<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import SlotCard from '$lib/components/SlotCard.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import MeetingCard from '$lib/components/MeetingCard.svelte';
	import PublishSheet from '$lib/components/PublishSheet.svelte';
	import type { SubmitSlot } from '$lib/domain/types';
	import { capture } from '$lib/analytics';
	import { copy } from '$lib/copy';
	import ParticipantsStack from '$lib/components/ParticipantsStack.svelte';
	import { formatShortDate as formatDate } from '$lib/utils/dates.js';
	import { buildResponseRows, ACTIVE_MEETING_STATES } from '$lib/domain/response-rows.js';

	import { isSlotFull } from '$lib/domain/time-slot.js';

	let { data }: { data: PageData } = $props();

	// Conversation size label shown near the times. capacity is the per-slot
	// joiner cap: 1 = one-on-one, ≥2 = small group (up to N others), null = no
	// label (legacy unlimited).
	let sizeLabel = $derived.by(() => {
		const cap = data.prompt.capacity;
		if (cap === null || cap === undefined) return null;
		if (cap === 1) return copy.conversation.sizeOneOnOne;
		return copy.conversation.sizeGroup(cap);
	});

	// Per-slot occupancy (confirmed joiners), from the viewer-safe RPC.
	function occupiedOn(slotId: string): number {
		return data.slotOccupancy?.[slotId] ?? 0;
	}
	// Capacity-aware fullness for a slot.
	function slotIsFull(slotId: string): boolean {
		return isSlotFull(occupiedOn(slotId), data.prompt.capacity);
	}
	// "+N others joining" marker count. Occupancy counts every confirmed joiner
	// on the slot, INCLUDING the viewer when they hold a seat. The marker is
	// about OTHERS, so subtract the viewer's own seat on the slot they joined.
	// A responder inviting to a slot they have not joined sees the raw count.
	function othersOn(slotId: string): number {
		const occupied = occupiedOn(slotId);
		const viewerHasSeatHere = data.myMeeting?.slot_id === slotId;
		return viewerHasSeatHere ? Math.max(0, occupied - 1) : occupied;
	}

	// svelte-ignore state_referenced_locally — intentional initial-value capture for editable field
	let responseText = $state(data.myComment?.body ?? '');
	let responseStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let responseError = $state('');
	let hasResponse = $derived(!!data.myComment || responseStatus === 'sent');

	// Invitation flow
	let selectedSlotId = $state<string | null>(null);
	let inviteMessage = $state('');
	let inviteStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let inviteError = $state('');
	// svelte-ignore state_referenced_locally — intentional initial-value capture for local tracking
	let invitedSlotIds = $state(new Set(data.invitedSlotIds ?? []));
	// svelte-ignore state_referenced_locally
	let invitationBySlotId = $state<Record<string, string>>({ ...(data.myInvitationBySlotId ?? {}) });

	let selectedSlot = $derived(data.prompt.available_slots.find(s => s.id === selectedSlotId));

	// Author: accept invitation
	let acceptingId = $state<string | null>(null);
	let acceptError = $state('');

	// Author: decline invitation (with optional message)
	let decliningId = $state<string | null>(null);
	let declineError = $state('');
	let openDeclineId = $state<string | null>(null);
	let declineMessage = $state('');

	async function submitResponse() {
		if (!responseText.trim()) return;
		responseStatus = 'sending';
		responseError = '';
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: responseText.trim() })
			});
			if (res.ok) {
				capture('response_sent');
				responseStatus = 'sent';
			} else {
				const err = await res.json().catch(() => ({}));
				responseError = (err as any).error ?? copy.common.sendFailed;
				responseStatus = 'error';
			}
		} catch {
			responseError = copy.common.networkError;
			responseStatus = 'error';
		}
	}

	async function sendInvite() {
		if (!selectedSlotId) return;
		inviteStatus = 'sending';
		inviteError = '';
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/invitations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slotId: selectedSlotId, message: inviteMessage.trim() || undefined })
			});
			if (res.ok) {
				const invitation = await res.json().catch(() => null) as { id?: string } | null;
				if (selectedSlotId) {
					invitedSlotIds = new Set([...invitedSlotIds, selectedSlotId]);
					if (invitation?.id) {
						invitationBySlotId = { ...invitationBySlotId, [selectedSlotId]: invitation.id };
					}
				}
				capture('invitation_sent');
				inviteStatus = 'sent';
			} else {
				const err = await res.json().catch(() => ({}));
				inviteError = (err as any).error ?? copy.common.sendFailed;
				inviteStatus = 'error';
			}
		} catch {
			inviteError = copy.common.networkError;
			inviteStatus = 'error';
		}
	}

	// Withdrawing a pending invitation is a free action per design principles —
	// no confirmation dialog, no reason required, no consequences. Uses the
	// local invitationBySlotId which covers both server-loaded and just-sent
	// invitations (kept in sync by sendInvite).
	let withdrawingSlotId = $state<string | null>(null);
	let withdrawError = $state('');
	async function withdrawInvitation(slotId: string) {
		const invitationId = invitationBySlotId[slotId];
		if (!invitationId) return;
		withdrawingSlotId = slotId;
		withdrawError = '';
		try {
			const res = await fetch(`/api/invitations/${invitationId}`, { method: 'DELETE' });
			if (res.ok) {
				capture('invitation_withdrawn');
				invitedSlotIds = new Set([...invitedSlotIds].filter(id => id !== slotId));
				const { [slotId]: _, ...rest } = invitationBySlotId;
				invitationBySlotId = rest;
				inviteStatus = 'idle';
				selectedSlotId = null;
				await invalidateAll();
			} else {
				// Keep local state untouched so the UI stays truthful — the server
				// invitation is still live and will reappear on reload.
				const body = await res.json().catch(() => ({}));
				withdrawError = (body as { error?: string }).error ?? copy.conversation.withdrawFailed;
			}
		} catch {
			withdrawError = copy.common.networkError;
		} finally {
			withdrawingSlotId = null;
		}
	}

	async function acceptInvitation(invitationId: string, slotId: string) {
		acceptingId = invitationId;
		acceptError = '';
		try {
			const res = await fetch(`/api/invitations/${invitationId}/accept`, { method: 'POST' });
			if (res.ok) {
				const { meetingId } = await res.json();
				// Carry the slot identity so realized group size per slot is derivable
				// (a gathering is the set of accepted meetings sharing one slot).
				// See docs/group-conversations-metrics.md.
				capture('invitation_accepted', { slot_id: slotId });
				goto(`/meetings/${meetingId}`);
			} else {
				const err = await res.json().catch(() => ({}));
				acceptError = (err as any).error ?? copy.common.genericError;
			}
		} catch {
			acceptError = copy.common.networkError;
		} finally {
			acceptingId = null;
		}
	}

	function openDecline(invitationId: string) {
		openDeclineId = invitationId;
		declineMessage = '';
		declineError = '';
	}

	function cancelDecline() {
		openDeclineId = null;
		declineMessage = '';
		declineError = '';
	}

	async function declineInvitation(invitationId: string) {
		decliningId = invitationId;
		declineError = '';
		try {
			const reason = declineMessage.trim();
			const res = await fetch(`/api/invitations/${invitationId}/decline`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(reason ? { reason } : {})
			});
			if (res.ok) {
				capture('invitation_declined');
				openDeclineId = null;
				declineMessage = '';
				await invalidateAll();
			} else {
				const err = await res.json().catch(() => ({}));
				declineError = (err as { error?: string }).error ?? copy.conversation.declineFailed;
			}
		} catch {
			declineError = copy.common.networkError;
		} finally {
			decliningId = null;
		}
	}

	let isOwnPrompt = $derived(data.prompt.author_id === data.user?.id);
	let unpublishDialog = $state<ConfirmDialog | undefined>();
	let deleteDialog = $state<ConfirmDialog | undefined>();
	let actionError = $state('');
	let showChangeTimesSheet = $state(false);
	let savingSlots = $state(false);
	/* action-menu state now lives inside FloatingNav (variant="detail"). */

	// Add / edit / remove slots from the read-view "Change times" sheet.
	// Mirrors the editor's handleSaveSlots diff pattern. Past slots aren't
	// in data.prompt.available_slots (filtered by the loader), so they
	// don't appear in the diff source — they stay untouched.
	async function handleChangeTimes(submitted: SubmitSlot[], _audienceScope: string | null) {
		const initialIds = new Set(data.prompt.available_slots.map((s) => s.id));
		const submittedIds = new Set(
			submitted.filter((s) => s.dbId).map((s) => s.dbId as string)
		);
		const remove = [...initialIds].filter((id) => !submittedIds.has(id));
		const edit = submitted
			.filter((s) => s.dbId)
			.map((s) => {
				const updates: Record<string, unknown> = {
					start_time: s.start_time,
					duration_minutes: s.duration_minutes
				};
				if (s.location) updates.location = s.location;
				return { slotId: s.dbId as string, updates };
			});
		const add = submitted
			.filter((s) => !s.dbId && s.location)
			.map((s) => ({
				start_time: s.start_time,
				duration_minutes: s.duration_minutes,
				location: s.location
			}));
		if (add.length === 0 && edit.length === 0 && remove.length === 0) {
			showChangeTimesSheet = false;
			return;
		}
		savingSlots = true;
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/slots`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ add, edit, remove })
			});
			if (res.ok) {
				capture('slots_changed', {
					added: add.length,
					edited: edit.length,
					removed: remove.length
				});
				showChangeTimesSheet = false;
				await invalidateAll();
			} else {
				const e = await res.json().catch(() => ({}));
				actionError = (e as { error?: string }).error ?? copy.common.genericError;
			}
		} catch {
			actionError = copy.common.networkError;
		} finally {
			savingSlots = false;
		}
	}

	async function unpublishPrompt() {
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/unpublish`, { method: 'POST' });
			if (res.ok) {
				capture('conversation_unpublished');
				goto(`/conversations/${data.prompt.id}/edit`);
			} else { const e = await res.json().catch(() => ({})); actionError = (e as any).error ?? copy.conversation.failedToUnpublish; }
		} catch { actionError = copy.common.networkError; }
	}

	async function deletePrompt() {
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}`, { method: 'DELETE' });
			if (res.ok) {
				capture('conversation_deleted', { origin: 'read_view' });
				goto('/profile?view=conversations');
			} else { const e = await res.json().catch(() => ({})); actionError = (e as any).error ?? copy.conversation.failedToDelete; }
		} catch { actionError = copy.common.networkError; }
	}

	// ── Author view: response-spine model ───────────────────────────────────
	// The derivation (status precedence, edge cases, ordering) is a pure,
	// unit-tested function in $lib/domain/response-rows — this page only wires
	// loader data in and renders the rows. The exact time/place lives once in
	// "Times you offered"; status lines reference a slot by day + neighbourhood.

	// Who's joining a slot — the active meetings on it. Rendered as tappable
	// name-buttons on the "Times you offered" card (each links to its meeting).
	function joiningOnSlot(slotId: string) {
		return (data.promptMeetings ?? []).filter(
			(m) => m.slot_id === slotId && ACTIVE_MEETING_STATES.includes(m.state)
		);
	}

	let responseRows = $derived.by(() =>
		buildResponseRows(data.comments, data.promptMeetings ?? [], data.receivedInvitations ?? [], formatDate)
	);
</script>

<svelte:head>
	<title>{data.prompt.title ?? 'Conversation'} - dyad.berlin</title>
</svelte:head>

<!-- Back navigation + kebab actions live on the FloatingNav (variant="detail"),
     not as separate fixed-position pills. -->

<div class="content">
	{#if data.prompt.cover_image_url}
		<img src={data.prompt.cover_image_url} alt="" class="cover" loading="lazy" />
	{/if}

	<h1 class="title">{data.prompt.title}</h1>
	<p class="meta">
		{#if isOwnPrompt}
			{copy.conversation.youWrote(formatDate(data.prompt.published_at))}
		{:else}
			on {formatDate(data.prompt.published_at)},
			<a href="/users/{data.prompt.author_username}" class="meta-author">
				{data.prompt.author_display_name ?? '@' + data.prompt.author_username}
			</a>
			wrote
		{/if}
	</p>

	<div class="body">
		{#if data.prompt.body_html}
			{@html data.prompt.body_html}
		{/if}
	</div>

	{#if sizeLabel}
		<p class="size-label">{sizeLabel}</p>
	{/if}

	{#if isOwnPrompt && data.prompt.state === 'published'}
		<ConfirmDialog
			bind:this={unpublishDialog}
			title={copy.conversation.unpublish}
			message={copy.conversation.unpublishConfirm}
			confirmLabel={copy.conversation.unpublish}
			onConfirm={unpublishPrompt}
		/>
		<ConfirmDialog
			bind:this={deleteDialog}
			title={copy.conversation.deleteTitle}
			message={copy.conversation.deleteConfirm}
			confirmLabel={copy.conversation.delete}
			onConfirm={deletePrompt}
		/>
		{#if actionError}<p class="field-error" style="margin-top: var(--space-2)">{actionError}</p>{/if}

		<!-- Reusable accept/decline action row for a pending invitation. -->
		{#snippet inviteActions(invId: string, slotId: string)}
			{#if openDeclineId === invId}
				<textarea
					class="invite-message-textarea"
					placeholder={copy.conversation.declineMessagePlaceholder}
					bind:value={declineMessage}
					rows={3}
					maxlength={2000}
					disabled={decliningId === invId}
				></textarea>
				{#if declineError}<p class="field-error" role="alert">{declineError}</p>{/if}
				<div class="invite-actions">
					<button class="btn-secondary" onclick={cancelDecline} disabled={decliningId === invId}>{copy.common.cancel}</button>
					<button class="btn-primary" onclick={() => declineInvitation(invId)} disabled={decliningId === invId}>{decliningId === invId ? copy.conversation.declining : copy.conversation.decline}</button>
				</div>
			{:else}
				<div class="invite-actions">
					<button class="btn-text btn-text--danger" onclick={() => openDecline(invId)} disabled={acceptingId === invId}>{copy.conversation.decline}</button>
					<button class="btn-primary" onclick={() => acceptInvitation(invId, slotId)} disabled={acceptingId === invId}>{acceptingId === invId ? copy.common.accepting : copy.common.accept}</button>
				</div>
			{/if}
		{/snippet}

		<!-- Times you offered: the schedule reference. Each offered time is shown
		     once (the exact place lives here, never per response) with a quiet fill
		     summary. Editing happens via the FloatingNav "change times" action. -->
		{#if data.prompt.available_slots.length > 0}
			<section class="my-summary">
				<p class="section-label">{copy.conversation.myOfferedTimes}</p>
				{#each data.prompt.available_slots as slot (slot.id)}
					{@const joining = joiningOnSlot(slot.id)}
					<!-- No invited/occupied/capacity props here: those dim the card, and the
					     author's own offered times should never render greyed out. Who's on
					     the slot is shown as name-buttons, not a count. -->
					<div class="slot-group">
						<SlotCard
							startTime={slot.start_time}
							durationMinutes={slot.duration_minutes}
							area={slot.general_area}
							exactLocation={slot.exact_location ?? null}
						>
							{#if joining.length > 0}
								<ParticipantsStack
									participants={joining.map((m) => ({
										id: m.id,
										name: m.partner_username ?? 'anonymous',
										href: `/meetings/${m.id}`
									}))}
								/>
							{/if}
						</SlotCard>
					</div>
				{/each}
			</section>
		{/if}

		<!-- Responses: the spine. Every responder's words stay visible whatever
		     their meeting status; a quiet status line annotates that status, and
		     the slot's time/place is referenced (day + neighbourhood) — never
		     reprinted. Pending requests are actionable inline; pending-first, then
		     most-recent. One shape serves one-on-one and small group. -->
		{#if responseRows.length > 0}
			<section class="responses-received">
				<p class="section-label">{copy.conversation.responsesHeading}</p>
				{#each responseRows as row (row.key)}
					<div class="response-card">
						<span class="response-meta">{copy.conversation.respondedBy(row.username, formatDate(row.createdAt))}</span>
						{#if row.body}<p class="response-body">{row.body}</p>{/if}
						{#if row.status === 'pending'}
							{#if row.message}<p class="inv-message">{row.message}</p>{/if}
							<p class="response-status">{copy.conversation.statusWantsToMeet(row.slotRef)}</p>
							{@render inviteActions(row.invitationId ?? '', row.slotId ?? '')}
						{:else if (row.status === 'confirmed' || row.status === 'met') && row.meetingId}
							{@const label = row.status === 'met' ? copy.conversation.statusMet(row.slotRef) : copy.conversation.statusConfirmed(row.slotRef)}
							<a href="/meetings/{row.meetingId}" class="response-status response-status--link">{label}</a>
						{:else if row.status === 'confirmed' || row.status === 'met'}
							<p class="response-status">{row.status === 'met' ? copy.conversation.statusMet(row.slotRef) : copy.conversation.statusConfirmed(row.slotRef)}</p>
						{:else if row.status === 'cancelled'}
							<p class="response-status response-status--muted">{copy.conversation.participantCancelled}{#if row.cancellationReason}: {row.cancellationReason}{/if}</p>
						{/if}
						<!-- 'responded' (no time chosen): just the words, no status line. -->
					</div>
				{/each}
				{#if acceptError}<p class="field-error">{acceptError}</p>{/if}
			</section>
		{/if}

	{/if}

	<!-- Response section (non-authors only) -->
	{#if !isOwnPrompt}
		<section class="response-section">
			{#if hasResponse}
				<div class="my-response">
					<p class="meta">
						{copy.conversation.youResponded(data.myComment ? formatDate(data.myComment.updated_at) : 'just now')}
						{#if responseStatus === 'sent'}
							<span class="response-sent-flag" aria-live="polite">· {copy.conversation.responseSent}</span>
						{/if}
					</p>
					<p class="my-response-text">{responseStatus === 'sent' ? responseText : data.myComment?.body}</p>
				</div>
			{:else}
				<textarea
					class="response-input"
					placeholder={data.prompt.available_slots.length > 0 ? copy.conversation.slotsTeaser(data.prompt.author_username) : copy.conversation.responsePlaceholder}
					bind:value={responseText}
					rows={3}
					disabled={responseStatus === 'sending'}
				></textarea>
				{#if responseError}<p class="field-error">{responseError}</p>{/if}
				<button class="btn-secondary" onclick={submitResponse} disabled={responseStatus === 'sending' || !responseText.trim()}>
					{responseStatus === 'sending' ? copy.conversation.sending : copy.common.send}
				</button>
			{/if}
		</section>
	{/if}

	<!-- Available times + invitation flow (non-authors only) -->
	{#if !isOwnPrompt}
		{#if data.myMeeting}
			<!-- Confirmed: meeting scheduled. Same <MeetingCard> used on the author
			     view and the profile surface — a meeting is symmetric regardless
			     of who initiated the conversation. -->
			<section class="slots-section">
				<a href="/meetings/{data.myMeeting.id}" class="meeting-card-link">
					<MeetingCard
						partnerUsername={data.prompt.author_username}
						scheduledTime={data.myMeeting.scheduled_time}
						durationMinutes={data.myMeeting.duration_minutes}
						generalArea={data.myMeeting.general_area}
						exactLocation={data.myMeeting.exact_location}
					/>
				</a>
			</section>
		{:else}
			<section class="slots-section">
				{#if data.myCancellation?.reason}
					<!-- Quiet note from the canceller. Shown whether or not slots are
					     available, so the context isn't hidden when a late cancel
					     leaves the prompt with no open slots to re-invite on. -->
					<blockquote class="prior-cancel-note">
						{data.myCancellation.reason}
						<cite>— @{data.myCancellation.cancelled_by_username ?? data.prompt.author_username}</cite>
					</blockquote>
				{/if}

				{#if data.prompt.available_slots.length === 0}
					<!-- No open slots is fine; the note above (if any) is all the context needed. -->
				{:else if invitedSlotIds.size > 0}
					<!-- Pending invitation (either server-loaded or just-sent this
					     session — sendInvite keeps `invitedSlotIds` + `invitationBySlotId`
					     in sync so the withdraw action works without a page reload). -->
					{#each data.prompt.available_slots.filter(s => invitedSlotIds.has(s.id)) as slot}
						<MeetingCard
							partnerUsername={data.prompt.author_username}
							scheduledTime={slot.start_time}
							durationMinutes={slot.duration_minutes}
							generalArea={slot.general_area}
							invitedPending
							onWithdraw={invitationBySlotId[slot.id] ? () => withdrawInvitation(slot.id) : undefined}
							withdrawing={withdrawingSlotId === slot.id}
						/>
					{/each}
					{#if withdrawError}<p class="field-error" role="alert">{withdrawError}</p>{/if}
				{:else}
					<!-- Normal invite flow -->
					{#if hasResponse}
						<p class="invite-question">{copy.conversation.inviteQuestion(data.prompt.author_username)}</p>
					{/if}

					{#each data.prompt.available_slots as slot}
						<SlotCard
							startTime={slot.start_time}
							durationMinutes={slot.duration_minutes}
							area={slot.general_area}
							vague={!hasResponse}
							selected={selectedSlotId === slot.id}
							invited={invitedSlotIds.has(slot.id)}
							occupied={occupiedOn(slot.id)}
							capacity={data.prompt.capacity}
							othersJoining={othersOn(slot.id)}
							onclick={hasResponse && !slotIsFull(slot.id) ? () => { selectedSlotId = selectedSlotId === slot.id ? null : slot.id; } : undefined}
						/>
					{/each}

					{#if selectedSlotId}
						{#if inviteError}<p class="field-error">{inviteError}</p>{/if}
						<textarea
							class="invite-message-textarea"
							placeholder={copy.conversation.inviteNotePlaceholder}
							bind:value={inviteMessage}
							rows={2}
							disabled={inviteStatus === 'sending'}
						></textarea>
						<button class="btn-primary" onclick={sendInvite} disabled={inviteStatus === 'sending'}>
							{inviteStatus === 'sending' ? copy.conversation.sending : copy.conversation.sendInvitation}
						</button>
					{/if}
				{/if}
			</section>
		{/if}
	{/if}

</div>

<FloatingNav
	variant="detail"
	attentionCount={data.attentionCount ?? 0}
	actions={isOwnPrompt && data.prompt.state === 'published'
		? [
				{ label: copy.conversation.changeTimes, onclick: () => (showChangeTimesSheet = true) },
				{ label: copy.conversation.unpublish, onclick: () => unpublishDialog?.open() },
				{ label: copy.conversation.delete, onclick: () => deleteDialog?.open(), danger: true }
			]
		: []}
/>

{#if showChangeTimesSheet}
	<PublishSheet
		onClose={() => (showChangeTimesSheet = false)}
		onPublish={handleChangeTimes}
		initialSlots={data.prompt.available_slots}
		publishing={savingSlots}
		submitLabel={copy.common.save}
		submittingLabel={copy.editor.saving}
	/>
{/if}

<style>
	.content { width: 100%; max-width: var(--content-standard); padding-bottom: var(--nav-clearance); }

	.cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius-card); margin-bottom: var(--space-6); display: block; }

	.title { font-size: var(--text-3xl); font-weight: normal; margin: 0 0 var(--space-2); line-height: var(--leading-tight); }
	.meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-8); }
	/* Conversation size (one-on-one / small group) — quiet coordination label. */
	.size-label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin: 0 0 var(--space-6);
	}
	.meta-author { color: var(--text-muted); text-decoration: none; }
	.meta-author:hover { color: var(--text-primary); }
	.body { font-size: var(--text-md); line-height: var(--leading-relaxed); margin-bottom: var(--space-10); }
	.body :global(p) { margin: 0 0 0.75em; }
	.body :global(h1), .body :global(h2) { margin: 1.2em 0 0.5em; font-weight: 500; }
	.body :global(blockquote) { border-left: 2px solid var(--text-muted); padding-left: var(--space-4); color: var(--text-muted); }
	.body :global(a) { color: var(--text-link); text-decoration: underline; }
	.body :global(img) { max-width: 100%; border-radius: var(--radius-input); }

	.btn-text--danger { color: var(--color-danger); }
	.btn-text--danger:hover { opacity: var(--opacity-hover-btn); }

	/* Accept / Decline action row beneath an invitation card. */
	.invite-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}
	.invite-actions :global(.btn-primary) { margin-left: auto; }

	/* Sections */
	.slots-section { margin-top: var(--space-4); margin-bottom: var(--space-6); }
	.response-section { margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--border-link); }

	/* "Times you offered" — the compact schedule reference. Quiet typography to
	   match the page idiom; the section label sits like the existing .meta line. */
	.my-summary { margin-top: var(--space-6); }
	.my-summary:first-of-type { padding-top: var(--space-6); border-top: 1px solid var(--border-link); }
	.section-label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-3);
	}

	.my-response { margin-bottom: var(--space-6); }
	.my-response-text { font-size: var(--text-md); line-height: var(--leading-relaxed); margin: 0 0 var(--space-2); }
	.response-sent-flag {
		color: var(--color-success);
		font-family: var(--font-mono);
		animation: response-sent-fade 4s ease-out forwards;
	}
	@keyframes response-sent-fade {
		0%, 60% { opacity: 1; }
		100% { opacity: 0; }
	}

	/* MeetingCard inside an <a> — strip link chrome so the card reads cleanly,
	 * but keep it hoverable/clickable for navigation to the meeting detail page. */
	.meeting-card-link {
		display: block;
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}
	.meeting-card-link:hover { opacity: var(--opacity-hover-card); }

	/* Invitation flow */
	.invite-question { font-size: var(--text-md); color: var(--text-muted); margin: 0 0 var(--space-4); }

	/* Withdraw button lives inside MeetingCard's invitedPending state. */

	/* Prior cancellation note — quiet blockquote, no red, no border. The note
	 * carries context without demanding attention. */
	.prior-cancel-note {
		font-size: var(--text-base);
		font-style: italic;
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		margin: 0 0 var(--space-5);
		padding: 0;
		border: none;
	}
	.prior-cancel-note cite {
		display: block;
		font-style: normal;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin-top: var(--space-2);
	}



	.invite-message-textarea {
		width: 100%;
		font-size: var(--text-sm);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		resize: vertical;
		line-height: var(--leading-relaxed);
		box-sizing: border-box;
		margin-top: var(--space-3);
		margin-bottom: var(--space-3);
	}
	.invite-message-textarea:focus { outline: none; border-color: var(--text-muted); }
	.invite-message-textarea::placeholder { color: var(--text-muted); }

	/* Response form */
	.response-input {
		font-size: var(--text-base);
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		resize: vertical;
		line-height: var(--leading-relaxed);
		box-sizing: border-box;
		margin-bottom: var(--space-3);
	}
	.response-input:focus { outline: none; border-color: var(--text-muted); }
	.response-input::placeholder { color: var(--text-muted); }

	/* Author view */
	.response-card {
		padding: var(--space-4);
		border-bottom: 1px solid var(--border-link);
		margin-bottom: var(--space-3);
	}
	.response-card:last-child { border-bottom: none; }
	.response-meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-bottom: var(--space-1); }
	.response-body { font-size: var(--text-base); margin: 0 0 var(--space-1); line-height: var(--leading-normal); }
	.inv-message { font-size: var(--text-sm); color: var(--text-secondary); font-style: italic; margin: var(--space-2) 0 var(--space-3); }

	/* "Times you offered": each slot once, with who's joining nested inside the
	   card on the right as an overlapping avatar stack (each circle links to its
	   meeting; hover/focus reveals the handle). Never dimmed. */
	.slot-group { margin-bottom: var(--space-4); }

	/* Responses: the spine. Single list; words always visible; a quiet status
	   line annotates meeting state (no coloured badges — the accept/decline
	   buttons are the actionability signal). */
	.responses-received { margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--border-link); }
	.response-status {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-secondary);
		margin: var(--space-2) 0 0;
	}
	.response-status--muted { color: var(--text-muted); }
	.response-status--link { display: inline-block; text-decoration: none; color: var(--text-link); }
	.response-status--link::after { content: ' →'; } /* nav affordance — decorative, not copy */
	.response-status--link:hover { text-decoration: underline; }
</style>
