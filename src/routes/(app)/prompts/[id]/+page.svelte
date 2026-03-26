<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let responseText = $state(data.myComment?.body ?? '');
	let responseStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let responseError = $state('');
	let hasResponse = $derived(!!data.myComment || responseStatus === 'sent');

	let selectedSlotId = $state<string | null>(null);
	let inviteStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let inviteError = $state('');
	let invitedSlotIds = $state(new Set(data.invitedSlotIds ?? []));

	function formatSlotDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

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
				body: JSON.stringify({ slotId: selectedSlotId })
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

	let isOwnPrompt = $derived(data.prompt.author_id === data.user?.id);
</script>

<svelte:head>
	<title>{data.prompt.title ?? 'Conversation'} - dyad.berlin</title>
</svelte:head>

<div class="content">
	<a href="/discover" class="back-link">← Back</a>

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

	<!-- Response + Invitation flow (non-authors only) -->
	{#if !isOwnPrompt}
		<!-- Step 1: Write a response -->
		<section class="response-section">
			{#if responseStatus === 'sent' || data.myComment}
				<div class="response-sent">
					<p class="success">Response sent.</p>
					{#if data.myComment && responseStatus !== 'sent'}
						<p class="existing-response">{data.myComment.body}</p>
					{/if}
					<button class="edit-response-btn" onclick={() => responseStatus = 'idle'}>Edit</button>
				</div>
			{:else}
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

		<!-- Step 2: Pick a time and invite (only after response) -->
		{#if hasResponse && data.prompt.available_slots.length > 0 && inviteStatus !== 'sent'}
			<section class="invite-section">
				<h2 class="section-title">Pick a time</h2>

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

				{#if inviteError}<p class="field-error">{inviteError}</p>{/if}
				{#if selectedSlotId}
					<button class="invite-btn" onclick={sendInvite} disabled={inviteStatus === 'sending'}>
						{inviteStatus === 'sending' ? 'Sending...' : 'Invite to meet'}
					</button>
				{/if}
			</section>
		{/if}

		{#if inviteStatus === 'sent'}
			<section class="invite-section">
				<p class="success">Invitation sent! The author will be notified.</p>
			</section>
		{/if}
	{/if}

	<!-- Author view: responses received -->
	{#if isOwnPrompt && data.comments.length > 0}
		<section class="responses-received">
			<h2 class="section-title">Responses received</h2>
			{#each data.comments as comment}
				<div class="response-card">
					<p class="response-body">{comment.body}</p>
					<span class="response-date">{new Date(comment.created_at).toLocaleDateString()}</span>
				</div>
			{/each}
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

	.response-section, .invite-section, .responses-received { margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--border-link); }

	.response-input { font-size: var(--text-base); width: 100%; padding: var(--space-3); border: 1px solid var(--border-link); border-radius: var(--radius-input); background: transparent; resize: vertical; line-height: 1.6; box-sizing: border-box; margin-bottom: var(--space-3); }
	.response-input:focus { outline: none; border-color: var(--text-muted); }
	.response-input::placeholder { color: var(--text-muted); }

	.response-sent { margin-bottom: var(--space-3); }
	.existing-response { font-size: var(--text-base); color: var(--text-muted); font-style: italic; margin: var(--space-2) 0; line-height: var(--leading-normal); }
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
