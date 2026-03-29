<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import SlotCard from '$lib/components/SlotCard.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
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

	let selectedSlot = $derived(data.prompt.available_slots.find(s => s.id === selectedSlotId));

	// Author: accept invitation
	let acceptingId = $state<string | null>(null);
	let acceptError = $state('');

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
			if (res.ok) { responseStatus = 'sent'; }
			else {
				const err = await res.json().catch(() => ({}));
				responseError = (err as any).error ?? 'Failed to send';
				responseStatus = 'error';
			}
		} catch {
			responseError = 'Network error';
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
				if (selectedSlotId) invitedSlotIds = new Set([...invitedSlotIds, selectedSlotId]);
				inviteStatus = 'sent';
			} else {
				const err = await res.json().catch(() => ({}));
				const rawError = (err as any).error ?? 'Failed to send invitation';
				inviteError = rawError.includes('uq_one_pending_invitation')
					? 'You already have a pending invitation for this time.'
					: rawError;
				inviteStatus = 'error';
			}
		} catch {
			inviteError = 'Network error';
			inviteStatus = 'error';
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
				acceptError = (err as any).error ?? 'Failed to accept';
			}
		} catch {
			acceptError = 'Network error';
		} finally {
			acceptingId = null;
		}
	}

	let isOwnPrompt = $derived(data.prompt.author_id === data.user?.id);
	let archiveDialog = $state<ConfirmDialog | undefined>();

	async function archivePrompt() {
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/unpublish`, { method: 'POST' });
			if (res.ok) goto('/profile');
		} catch { /* ignore */ }
	}
</script>

<svelte:head>
	<title>{data.prompt.title ?? 'Conversation'} - dyad.berlin</title>
</svelte:head>

<div class="content">
	{#if data.prompt.cover_image_url}
		<img src={data.prompt.cover_image_url} alt="" class="cover" loading="lazy" />
	{/if}

	<h1 class="title">{data.prompt.title}</h1>
	<p class="meta">{copy.conversation.publishedBy(data.prompt.author_username, formatDate(data.prompt.published_at))}</p>

	<div class="body">
		{#if data.prompt.body_html}
			{@html data.prompt.body_html}
		{:else if data.prompt.body_snippet}
			<p>{data.prompt.body_snippet}</p>
		{/if}
	</div>

	<!-- Author actions -->
	{#if isOwnPrompt && data.prompt.state === 'published'}
		<div class="author-actions">
			<a href="/conversations/{data.prompt.id}/edit" class="btn-text">{copy.conversation.edit}</a>
			<button class="btn-text" onclick={() => archiveDialog?.open()}>{copy.conversation.archive}</button>
		</div>
		<ConfirmDialog
			bind:this={archiveDialog}
			title={copy.conversation.archive}
			message={copy.conversation.archiveConfirm}
			confirmLabel={copy.conversation.archive}
			onConfirm={archivePrompt}
		/>
	{/if}

	<!-- Response section (non-authors only) -->
	{#if !isOwnPrompt}
		<section class="response-section">
			{#if hasResponse}
				<div class="my-response">
					<p class="meta">{copy.conversation.youResponded(data.myComment ? formatDate(data.myComment.updated_at) : 'just now')}</p>
					<p class="my-response-text">{responseStatus === 'sent' ? responseText : data.myComment?.body}</p>
				</div>
			{:else}
				<textarea
					class="response-input"
					placeholder={data.prompt.available_slots.length > 0 ? copy.conversation.responsePlaceholderWithSlots : copy.conversation.responsePlaceholder}
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
			<!-- Confirmed: meeting scheduled -->
			<section class="slots-section">
				<div class="confirmed-card">
					<span class="confirmed-label">{copy.conversation.confirmed}</span>
					<p class="confirmed-title">{copy.conversation.youAreMeeting(data.prompt.author_username)}</p>
					<SlotCard
						startTime={data.myMeeting.scheduled_time}
						durationMinutes={data.myMeeting.duration_minutes}
						area={data.myMeeting.general_area}
						exactLocation={data.myMeeting.exact_location}
					/>
					<a href="/meetings/{data.myMeeting.id}" class="view-meeting-link">{copy.conversation.viewMeeting}</a>
				</div>
			</section>
		{:else if data.prompt.available_slots.length > 0}
			<section class="slots-section">
				{#if inviteStatus === 'sent'}
					<!-- Just sent this session -->
					{#if selectedSlot}
						<SlotCard
							startTime={selectedSlot.start_time}
							durationMinutes={selectedSlot.duration_minutes}
							area={selectedSlot.general_area}
							invited={true}
							invitedNote={copy.conversation.invitationPending(data.prompt.author_username)}
						/>
					{/if}
				{:else if invitedSlotIds.size > 0}
					<!-- Server-loaded: invitation already pending -->
					{#each data.prompt.available_slots.filter(s => invitedSlotIds.has(s.id)) as slot}
						<SlotCard
							startTime={slot.start_time}
							durationMinutes={slot.duration_minutes}
							area={slot.general_area}
							invited={true}
							invitedNote={copy.conversation.invitationPending(data.prompt.author_username)}
						/>
					{/each}
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
				{@const meeting = invitation?.state === 'accepted' ? data.promptMeetings?.find(m => m.slot_id === invitation.slot_id) : null}
				<div class="response-card" class:has-invitation={!!invitation}>
					<span class="response-meta">@{comment.author_username ?? 'anonymous'} · {formatDate(comment.created_at)}</span>
					<p class="response-body">{comment.body}</p>

					{#if invitation}
						<div class="response-invitation">
							{#if invitation.state === 'accepted' && meeting}
								<a href="/meetings/{meeting.id}" class="meeting-link">
									{copy.conversation.meetingScheduled}
								</a>
								<SlotCard startTime={invitation.slot_start_time} durationMinutes={invitation.slot_duration_minutes ?? 60} area={invitation.slot_general_area} />
							{:else if invitation.state === 'accepted'}
								<SlotCard startTime={invitation.slot_start_time} durationMinutes={invitation.slot_duration_minutes ?? 60} area={invitation.slot_general_area} />
							{:else if invitation.state === 'pending'}
								<SlotCard startTime={invitation.slot_start_time} durationMinutes={invitation.slot_duration_minutes ?? 60} area={invitation.slot_general_area} />
								{#if invitation.message}
									<p class="inv-message">{invitation.message}</p>
								{/if}
								<button class="btn-primary" onclick={() => acceptInvitation(invitation.id)} disabled={acceptingId === invitation.id}>
									{acceptingId === invitation.id ? copy.common.accepting : copy.common.accept}
								</button>
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
							<button class="btn-primary" onclick={() => acceptInvitation(inv.id)} disabled={acceptingId === inv.id}>
								{acceptingId === inv.id ? copy.common.accepting : copy.common.accept}
							</button>
						{/if}
					</div>
				</div>
			{/each}

			{#if acceptError}<p class="field-error">{acceptError}</p>{/if}
		</section>
	{/if}
</div>

<FloatingNav variant="default" attentionCount={data.attentionCount ?? 0} />

<style>
	.content { width: 100%; max-width: var(--content-standard); }

	.cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius-card); margin-bottom: var(--space-6); }

	.title { font-size: var(--text-3xl); font-weight: normal; margin: 0 0 var(--space-2); line-height: var(--leading-tight); }
	.meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-8); }

	.body { font-size: var(--text-md); line-height: var(--leading-relaxed); margin-bottom: var(--space-10); }
	.body :global(p) { margin: 0 0 0.75em; }
	.body :global(h1), .body :global(h2) { margin: 1.2em 0 0.5em; font-weight: 500; }
	.body :global(blockquote) { border-left: 2px solid var(--text-muted); padding-left: var(--space-4); color: var(--text-muted); }
	.body :global(a) { color: var(--text-link); text-decoration: underline; }
	.body :global(img) { max-width: 100%; border-radius: var(--radius-input); }

	/* Author actions */
	.author-actions { display: flex; gap: var(--space-4); margin-bottom: var(--space-6); }

	/* Sections */
	.slots-section { margin-top: var(--space-4); margin-bottom: var(--space-6); }
	.response-section, .responses-received { margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--border-link); }

	/* My response */
	.my-response { margin-bottom: var(--space-6); }
	.my-response-text { font-size: var(--text-md); line-height: var(--leading-relaxed); margin: 0 0 var(--space-2); }

	/* Confirmed meeting card */
	.confirmed-card {
		padding: var(--space-5);
		background: var(--bg-meeting-tint);
		border: 1px solid color-mix(in srgb, var(--color-success) 20%, transparent);
		border-radius: var(--radius-card);
	}

	.confirmed-label {
		display: block;
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-success);
		margin-bottom: var(--space-2);
	}

	.confirmed-title {
		font-size: var(--text-md);
		font-weight: 500;
		margin: 0 0 var(--space-3);
		color: var(--text-primary);
	}

	.view-meeting-link {
		display: inline-block;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-success);
		text-decoration: none;
		margin-top: var(--space-1);
	}

	.view-meeting-link:hover { opacity: var(--opacity-hover-btn); }

	/* Invitation flow */
	.invite-question { font-size: var(--text-md); color: var(--text-muted); margin: 0 0 var(--space-4); }

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
	.response-card { padding: var(--space-3) 0; border-bottom: 1px solid var(--border-link); }
	.response-card.has-invitation { border: 1px solid var(--border-link); border-radius: var(--radius-card); padding: var(--space-4); margin-bottom: var(--space-3); border-bottom: none; }
	.response-meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-bottom: var(--space-1); }
	.response-body { font-size: var(--text-base); margin: 0 0 var(--space-1); line-height: var(--leading-normal); }
	.response-invitation { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--border-link); }
	.meeting-link { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-success); display: block; margin-bottom: var(--space-2); }
	.meeting-link:hover { opacity: var(--opacity-hover-card); }
	.inv-message { font-size: var(--text-sm); color: var(--text-secondary); font-style: italic; margin: var(--space-2) 0 var(--space-3); }
</style>
