<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import SlotCard from '$lib/components/SlotCard.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import MeetingCard from '$lib/components/MeetingCard.svelte';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

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

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

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
	// Active (non-cancelled, non-completed) meetings the author is hosting
	// against this prompt. Drives the author summary card list.
	let activeAuthorMeetings = $derived(
		(data.promptMeetings ?? []).filter(
			(m) => m.state === 'scheduled' || m.state === 'awaiting_feedback'
		)
	);
	let archiveDialog = $state<ConfirmDialog | undefined>();
	let deleteDialog = $state<ConfirmDialog | undefined>();
	let actionError = $state('');
	/* action-menu state now lives inside FloatingNav (variant="detail"). */

	async function archivePrompt() {
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/archive`, { method: 'POST' });
			if (res.ok) goto('/profile?view=conversations');
			else { const e = await res.json().catch(() => ({})); actionError = (e as any).error ?? copy.conversation.failedToArchive; }
		} catch { actionError = copy.common.networkError; }
	}

	async function deletePrompt() {
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}`, { method: 'DELETE' });
			if (res.ok) goto('/profile?view=conversations');
			else { const e = await res.json().catch(() => ({})); actionError = (e as any).error ?? copy.conversation.failedToDelete; }
		} catch { actionError = copy.common.networkError; }
	}
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
		on {formatDate(data.prompt.published_at)},
		<a href="/users/{data.prompt.author_username}" class="meta-author">
			{data.prompt.author_display_name ?? '@' + data.prompt.author_username}
		</a>
		wrote
	</p>

	<div class="body">
		{#if data.prompt.body_html}
			{@html data.prompt.body_html}
		{/if}
	</div>

	{#if isOwnPrompt && data.prompt.state === 'published'}
		<ConfirmDialog
			bind:this={archiveDialog}
			title={copy.conversation.archive}
			message={copy.conversation.archiveConfirm}
			confirmLabel={copy.conversation.archive}
			onConfirm={archivePrompt}
		/>
		<ConfirmDialog
			bind:this={deleteDialog}
			title={copy.conversation.deleteTitle}
			message={copy.conversation.deleteConfirm}
			confirmLabel={copy.conversation.delete}
			onConfirm={deletePrompt}
		/>
		{#if actionError}<p class="field-error" style="margin-top: var(--space-2)">{actionError}</p>{/if}

		<!-- Author summary: the times they offered + any active meetings against
		     them. Mirrors the responder-side slot/meeting blocks but read-only. -->
		{#if data.prompt.available_slots.length > 0}
			<section class="my-summary">
				<p class="section-label">{copy.conversation.myOfferedTimes}</p>
				{#each data.prompt.available_slots as slot}
					<SlotCard
						startTime={slot.start_time}
						durationMinutes={slot.duration_minutes}
						area={slot.general_area}
						invited={slot.accepted}
						invitedNote={slot.accepted ? copy.conversation.myOfferedTimesBooked : undefined}
					/>
				{/each}
			</section>
		{/if}

		{#if activeAuthorMeetings.length > 0}
			<section class="my-summary">
				<p class="section-label">{copy.conversation.myScheduledMeetings}</p>
				{#each activeAuthorMeetings as m}
					<a href="/meetings/{m.id}" class="meeting-card-link">
						<MeetingCard
							partnerUsername={m.partner_username ?? copy.common.someone}
							scheduledTime={m.scheduled_time}
							durationMinutes={m.duration_minutes}
							generalArea={m.general_area}
							exactLocation={m.exact_location}
						/>
					</a>
				{/each}
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
							onclick={hasResponse ? () => { selectedSlotId = selectedSlotId === slot.id ? null : slot.id; } : undefined}
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

	<!-- Author view: responses + their invitations together -->
	{#if isOwnPrompt && (data.comments.length > 0 || data.receivedInvitations.length > 0)}
		<section class="responses-received">
			{#each data.comments as comment}
				{@const invitation = data.receivedInvitations.find(inv => inv.inviter_id === comment.author_id)}
				{@const meeting = invitation ? data.promptMeetings?.find(m => m.slot_id === invitation.slot_id) : null}
				<div class="response-card" class:has-invitation={!!invitation}>
					<span class="response-meta">@{comment.author_username ?? 'anonymous'} · {formatDate(comment.created_at)}</span>
					<p class="response-body">{comment.body}</p>

					{#if invitation}
						<div class="response-invitation">
							{#if invitation.state === 'accepted' && meeting && (meeting.state === 'cancelled_early' || meeting.state === 'cancelled_late')}
								<!-- Accepted invitation whose meeting was later cancelled. Any newer
								     pending re-invitation takes the pending branch because the loader
								     picks the most-recent invitation per inviter. -->
								<MeetingCard
									partnerUsername={comment.author_username ?? 'anonymous'}
									scheduledTime={meeting.scheduled_time}
									durationMinutes={invitation.slot_duration_minutes ?? 60}
									generalArea={meeting.general_area ?? invitation.slot_general_area}
									exactLocation={meeting.exact_location}
									cancelled
									cancelledByMe={meeting.cancelled_by !== null && meeting.cancelled_by === data.user.id}
									cancelledByUsername={meeting.cancelled_by !== null && meeting.cancelled_by !== data.user.id
										? (meeting.cancelled_by_username ?? comment.author_username ?? null)
										: null}
									cancellationReason={meeting.cancellation_reason}
								/>
							{:else if invitation.state === 'accepted' && meeting}
								<a href="/meetings/{meeting.id}" class="meeting-card-link">
									<MeetingCard
										partnerUsername={comment.author_username ?? 'anonymous'}
										scheduledTime={meeting.scheduled_time}
										durationMinutes={invitation.slot_duration_minutes ?? 60}
										generalArea={meeting.general_area ?? invitation.slot_general_area}
										exactLocation={meeting.exact_location}
									/>
								</a>
							{:else if invitation.state === 'accepted'}
								<!-- Accepted but meeting record isn't loaded (rare fallback). -->
								<MeetingCard
									partnerUsername={comment.author_username ?? 'anonymous'}
									scheduledTime={invitation.slot_start_time}
									durationMinutes={invitation.slot_duration_minutes ?? 60}
									generalArea={invitation.slot_general_area}
								/>
							{:else if invitation.state === 'pending'}
								<SlotCard startTime={invitation.slot_start_time} durationMinutes={invitation.slot_duration_minutes ?? 60} area={invitation.slot_general_area} />
								{#if invitation.message}
									<p class="inv-message">{invitation.message}</p>
								{/if}
								{#if openDeclineId === invitation.id}
									<textarea
										class="invite-message-textarea"
										placeholder={copy.conversation.declineMessagePlaceholder}
										bind:value={declineMessage}
										rows={3}
										maxlength={2000}
										disabled={decliningId === invitation.id}
									></textarea>
									{#if declineError}<p class="field-error" role="alert">{declineError}</p>{/if}
									<div class="invite-actions">
										<button class="btn-secondary" onclick={cancelDecline} disabled={decliningId === invitation.id}>
											{copy.common.cancel}
										</button>
										<button class="btn-primary" onclick={() => declineInvitation(invitation.id)} disabled={decliningId === invitation.id}>
											{decliningId === invitation.id ? copy.conversation.declining : copy.conversation.decline}
										</button>
									</div>
								{:else}
									<div class="invite-actions">
										<button class="btn-text btn-text--danger" onclick={() => openDecline(invitation.id)} disabled={acceptingId === invitation.id}>
											{copy.conversation.decline}
										</button>
										<button class="btn-primary" onclick={() => acceptInvitation(invitation.id)} disabled={acceptingId === invitation.id}>
											{acceptingId === invitation.id ? copy.common.accepting : copy.common.accept}
										</button>
									</div>
								{/if}
							{/if}
						</div>
					{/if}
				</div>
			{/each}

			<!-- Invitations without a matching comment (edge case) -->
			{#each data.receivedInvitations.filter(inv => !data.comments.some(c => c.author_id === inv.inviter_id)) as inv}
				<div class="response-card has-invitation">
					<span class="response-meta">@{inv.inviter_username} · {formatDate(inv.created_at)}</span>
					{#if inv.comment_body}
						<p class="response-body">{inv.comment_body}</p>
					{/if}
					<div class="response-invitation">
						<SlotCard startTime={inv.slot_start_time} durationMinutes={inv.slot_duration_minutes ?? 60} area={inv.slot_general_area} />
						{#if inv.state === 'pending'}
							{#if inv.message}
								<p class="inv-message">{inv.message}</p>
							{/if}
							{#if openDeclineId === inv.id}
								<textarea
									class="invite-message-textarea"
									placeholder={copy.conversation.declineMessagePlaceholder}
									bind:value={declineMessage}
									rows={3}
									maxlength={2000}
									disabled={decliningId === inv.id}
								></textarea>
								{#if declineError}<p class="field-error" role="alert">{declineError}</p>{/if}
								<div class="invite-actions">
									<button class="btn-secondary" onclick={cancelDecline} disabled={decliningId === inv.id}>
										{copy.common.cancel}
									</button>
									<button class="btn-primary" onclick={() => declineInvitation(inv.id)} disabled={decliningId === inv.id}>
										{decliningId === inv.id ? copy.conversation.declining : copy.conversation.decline}
									</button>
								</div>
							{:else}
								<div class="invite-actions">
									<button class="btn-text btn-text--danger" onclick={() => openDecline(inv.id)} disabled={acceptingId === inv.id}>
										{copy.conversation.decline}
									</button>
									<button class="btn-primary" onclick={() => acceptInvitation(inv.id)} disabled={acceptingId === inv.id}>
										{acceptingId === inv.id ? copy.common.accepting : copy.common.accept}
									</button>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/each}

			{#if acceptError}<p class="field-error">{acceptError}</p>{/if}
		</section>
	{/if}
</div>

<FloatingNav
	variant="detail"
	attentionCount={data.attentionCount ?? 0}
	actions={isOwnPrompt && data.prompt.state === 'published'
		? [
				{ label: copy.conversation.archive, onclick: () => archiveDialog?.open() },
				{ label: copy.conversation.delete, onclick: () => deleteDialog?.open(), danger: true }
			]
		: []}
/>

<style>
	.content { width: 100%; max-width: var(--content-standard); padding-bottom: var(--nav-clearance); }

	.cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius-card); margin-bottom: var(--space-6); display: block; }

	.title { font-size: var(--text-3xl); font-weight: normal; margin: 0 0 var(--space-2); line-height: var(--leading-tight); }
	.meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-8); }
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
	.response-section, .responses-received { margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--border-link); }

	/* Author summary blocks above .responses-received: list of offered times,
	   list of scheduled meetings. Quiet typography to match the page idiom — the
	   section label sits like the existing .meta line, the cards do the work. */
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
	.response-invitation { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--border-link); }
	.meeting-link { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-success); display: block; margin-bottom: var(--space-2); }
	.meeting-link:hover { opacity: var(--opacity-hover-card); }
	.inv-message { font-size: var(--text-sm); color: var(--text-secondary); font-style: italic; margin: var(--space-2) 0 var(--space-3); }
</style>
