<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let from = $derived($page.url.searchParams.get('from'));
	let backHref = $derived(from === 'profile' ? '/profile' : '/discover');
	let backLabel = $derived(from === 'profile' ? '← back to profile' : '← back to discover');
	let responseText = $state(data.myComment?.body ?? '');
	let responseStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let responseError = $state('');
	let hasResponse = $derived(!!data.myComment || responseStatus === 'sent');

	let selectedSlotId = $state<string | null>(null);
	let inviteMessage = $state('');
	let inviteStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let inviteError = $state('');
	let invitedSlotIds = $state(new Set(data.invitedSlotIds ?? []));

	// Author: accept invitation
	let acceptingId = $state<string | null>(null);
	let acceptError = $state('');

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	// Alias for template clarity
	const formatSlotDate = formatDate;

	function formatSlotTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
					inviteStatus = 'sent';
					if (selectedSlotId) invitedSlotIds = new Set([...invitedSlotIds, selectedSlotId]);
				}
			else {
				const err = await res.json().catch(() => ({}));
				const rawError = (err as any).error ?? 'Failed to send invitation';
				if (rawError.includes('uq_one_pending_invitation')) {
					inviteError = 'You already have a pending invitation for this time.';
				} else {
					inviteError = rawError;
				}
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
				goto(`/meetings/${meetingId}?from=${from ?? 'discover'}`);
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
</script>

<svelte:head>
	<title>{data.prompt.title ?? 'Conversation'} - dyad.berlin</title>
</svelte:head>

<div class="content">
	<a href={backHref} class="back-link">{backLabel}</a>

	{#if data.prompt.cover_image_url}
		<img src={data.prompt.cover_image_url} alt="" class="cover" loading="lazy" />
	{/if}

	<h1 class="title">{data.prompt.title}</h1>
	<p class="meta">@{data.prompt.author_username}</p>

	<div class="body">
		{#if data.prompt.body_html}
			{@html data.prompt.body_html}
		{:else if data.prompt.body_snippet}
			<p>{data.prompt.body_snippet}</p>
		{/if}
	</div>

	<!-- Available times (visible to everyone, read-only for non-authors before responding) -->
	{#if !isOwnPrompt && data.prompt.available_slots.length > 0}
		<section class="slots-info">
			{#each data.prompt.available_slots as slot}
				<div class="slot-item">
					<div class="slot-info">
						<span class="slot-date">{formatSlotDate(slot.start_time)}</span>
						<span class="slot-time">{formatSlotTime(slot.start_time)}</span>
						<span class="slot-duration">{slot.duration_minutes} min</span>
						<span class="slot-area">{slot.general_area}</span>
					</div>
				</div>
			{/each}
		</section>
	{/if}

	<!-- Response + Invitation flow (non-authors only) -->
	{#if !isOwnPrompt}
		<section class="response-section">
			{#if responseStatus === 'sent' || data.myComment}
				<!-- Show the actual response text -->
				<div class="my-response">
					<p class="my-response-text">{responseStatus === 'sent' ? responseText : data.myComment?.body}</p>
					<button class="edit-response-btn" onclick={() => responseStatus = 'idle'}>Edit</button>
				</div>

				<!-- Invitation flow -->
				{#if data.prompt.available_slots.length > 0 && inviteStatus !== 'sent'}
					<div class="invite-flow">
						<p class="invite-prompt">Would you like to meet @{data.prompt.author_username} in person?</p>

						{#each data.prompt.available_slots as slot}
							<div class="slot-item" class:selected={selectedSlotId === slot.id}>
								<div class="slot-info">
									<span class="slot-date">{formatSlotDate(slot.start_time)}</span>
									<span class="slot-time">{formatSlotTime(slot.start_time)}</span>
									<span class="slot-duration">{slot.duration_minutes} min</span>
									<span class="slot-area">{slot.general_area}</span>
								</div>
								{#if invitedSlotIds.has(slot.id)}
									<span class="invited-badge">Invited</span>
								{:else}
									<button class="select-slot" onclick={() => selectedSlotId = selectedSlotId === slot.id ? null : slot.id}>
										{selectedSlotId === slot.id ? 'Selected' : 'Select'}
									</button>
								{/if}
							</div>
						{/each}

						{#if selectedSlotId}
							<textarea
								class="response-input"
								placeholder="Add a message..."
								bind:value={inviteMessage}
								rows={2}
								disabled={inviteStatus === 'sending'}
							></textarea>
						{/if}
						{#if inviteError}<p class="field-error">{inviteError}</p>{/if}
						{#if selectedSlotId}
							<button class="invite-btn" onclick={sendInvite} disabled={inviteStatus === 'sending'}>
								{inviteStatus === 'sending' ? 'Sending...' : 'Invite to meet'}
							</button>
						{/if}
					</div>
				{/if}

				{#if inviteStatus === 'sent'}
					<div class="invitation-sent-card">
						<p class="invite-prompt">Invitation sent — waiting for @{data.prompt.author_username}</p>
					</div>
				{/if}
			{:else}
				<!-- Response form -->
				<textarea
					class="response-input"
					placeholder="Write a response..."
					bind:value={responseText}
					rows={3}
					disabled={responseStatus === 'sending'}
				></textarea>
				{#if responseError}<p class="field-error">{responseError}</p>{/if}
				<button class="submit-btn" onclick={submitResponse} disabled={responseStatus === 'sending' || !responseText.trim()}>
					{responseStatus === 'sending' ? 'Sending...' : 'Send'}
				</button>
			{/if}
		</section>
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
								<a href="/meetings/{meeting.id}?from={from ?? 'discover'}" class="meeting-link">
									Meeting scheduled · {formatSlotDate(invitation.slot_start_time)} · {formatSlotTime(invitation.slot_start_time)} · {invitation.slot_general_area}
								</a>
							{:else}
								<div class="inv-slot">{formatSlotDate(invitation.slot_start_time)} · {formatSlotTime(invitation.slot_start_time)} · {invitation.slot_general_area}</div>
								{#if invitation.message}
									<p class="inv-message">{invitation.message}</p>
								{/if}
								<button class="invite-btn" onclick={() => acceptInvitation(invitation.id)} disabled={acceptingId === invitation.id}>
									{acceptingId === invitation.id ? 'Accepting...' : 'Accept'}
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
						<div class="inv-slot">{formatSlotDate(inv.slot_start_time)} · {formatSlotTime(inv.slot_start_time)} · {inv.slot_general_area}</div>
						{#if inv.message}
							<p class="inv-message">{inv.message}</p>
						{/if}
						<button class="invite-btn" onclick={() => acceptInvitation(inv.id)} disabled={acceptingId === inv.id}>
							{acceptingId === inv.id ? 'Accepting...' : 'Accept'}
						</button>
					</div>
				</div>
			{/each}

			{#if acceptError}<p class="field-error">{acceptError}</p>{/if}
		</section>
	{/if}
</div>

<style>
	/* .back-link uses global shared class */
	.content { width: 100%; max-width: 700px; }

	.cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius-card); margin-bottom: var(--space-6); }

	.title { font-size: var(--text-3xl); font-weight: normal; margin: 0 0 var(--space-2); line-height: var(--leading-tight); }
	.meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-8); }

	.body { font-size: var(--text-md); line-height: var(--leading-relaxed); margin-bottom: var(--space-10); }
	.body :global(p) { margin: 0 0 0.75em; }
	.body :global(h1), .body :global(h2) { margin: 1.2em 0 0.5em; font-weight: 500; }
	.body :global(blockquote) { border-left: 2px solid var(--text-muted); padding-left: var(--space-4); color: var(--text-muted); }
	.body :global(a) { color: var(--text-link); text-decoration: underline; }
	.body :global(img) { max-width: 100%; border-radius: 4px; }

	/* .section-title uses global shared class */

	.slot-item { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--border-link); }
	.slot-item.selected { background: rgba(61,158,90,0.06); margin: 0 calc(-1 * var(--space-2)); padding: var(--space-3) var(--space-2); border-radius: 4px; }
	.slot-info { display: flex; gap: var(--space-3); font-size: var(--text-base); }
	.slot-date { font-weight: 500; }
	.slot-time, .slot-duration { color: var(--text-muted); }
	.slot-area { font-family: var(--font-mono); font-size: var(--text-xs); text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.04em; }
	.select-slot { font-size: var(--text-sm); padding: var(--space-2) var(--space-3); border: 1px solid var(--border-link); border-radius: 4px; background: none; cursor: pointer; }
	.select-slot:hover { border-color: var(--text-primary); }
	.invited-badge { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-success); padding: var(--space-2) var(--space-3); }

	.slots-info { margin-bottom: var(--space-6); }
	.response-section, .invite-section, .responses-received, .invitations-received { margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--border-link); }

	.my-response { margin-bottom: var(--space-4); }
	.my-response-text { font-size: var(--text-md); line-height: var(--leading-relaxed); margin: 0 0 var(--space-2); }

	.invite-flow { margin-top: var(--space-4); }
	.invite-prompt { font-size: var(--text-md); color: var(--text-muted); margin: 0 0 var(--space-4); }

	.invitation-sent-card {
		margin-top: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
	}

	.response-card.has-invitation { border: 1px solid var(--border-link); border-radius: var(--radius-card); padding: var(--space-4); margin-bottom: var(--space-3); }
	.response-invitation { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--border-link); }
	.meeting-link { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-success); display: block; }
	.meeting-link:hover { opacity: 0.7; }
	.inv-slot { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-2); }
	.inv-message { font-size: var(--text-sm); color: var(--text-secondary); font-style: italic; margin: 0 0 var(--space-3); }
	.response-meta { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-bottom: var(--space-1); }

	.response-input { font-size: var(--text-base); width: 100%; padding: var(--space-3); border: 1px solid var(--border-link); border-radius: var(--radius-input); background: transparent; resize: vertical; line-height: 1.6; box-sizing: border-box; margin-bottom: var(--space-3); }
	.response-input:focus { outline: none; border-color: var(--text-muted); }
	.response-input::placeholder { color: var(--text-muted); }

	.edit-response-btn { font-size: var(--text-xs); color: var(--text-muted); background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; }

	.invite-btn { font-size: var(--text-base); padding: var(--space-3) var(--space-6); background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: var(--radius-input); cursor: pointer; margin-top: var(--space-3); }
	.invite-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.submit-btn { font-size: var(--text-sm); padding: var(--space-2) var(--space-5); border: 1px solid var(--text-primary); border-radius: var(--radius-input); background: none; cursor: pointer; }
	.submit-btn:hover:not(:disabled) { background: var(--text-primary); color: var(--bg-canvas); }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.success { font-size: var(--text-base); color: var(--color-success); }
	/* .field-error uses global shared class */

	.response-card { padding: var(--space-3) 0; border-bottom: 1px solid var(--border-link); }
	.response-body { font-size: var(--text-base); margin: 0 0 var(--space-1); line-height: var(--leading-normal); }
	.response-date { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
</style>
