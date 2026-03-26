<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();
	let fromMap = $derived($page.url.searchParams.get('from') === 'map');
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

{#if fromMap}
	<a href="/discover?view=map" class="back-to-map">← Back to map</a>
{/if}

{#if data.prompt.cover_image_url}
	<div class="cover-wrap">
		<img src={data.prompt.cover_image_url} alt="" class="cover" loading="lazy" />
	</div>
{/if}

<div class="content">
	<p class="meta">@{data.prompt.author_username}</p>
	<h1 class="title">{data.prompt.title}</h1>

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
			<h2 class="section-title">Write a response</h2>
			<p class="privacy-hint">Only visible to you and the author.</p>

			{#if responseStatus === 'sent' || data.myComment}
				<div class="response-sent">
					<p class="success">Your response{data.myComment && responseStatus !== 'sent' ? '' : ' was sent'}.</p>
					{#if data.myComment && responseStatus !== 'sent'}
						<p class="existing-response">{data.myComment.body}</p>
					{/if}
					<button class="edit-response-btn" onclick={() => responseStatus = 'idle'}>Edit response</button>
				</div>
			{:else}
				<textarea
					class="response-input"
					placeholder="What does this make you think about? What would you want to talk about?"
					bind:value={responseText}
					rows={4}
					disabled={responseStatus === 'sending'}
				></textarea>
				{#if responseError}<p class="field-error">{responseError}</p>{/if}
				<button class="submit-btn" onclick={submitResponse} disabled={responseStatus === 'sending' || !responseText.trim()}>
					{responseStatus === 'sending' ? 'Sending...' : (data.myComment ? 'Update response' : 'Send response')}
				</button>
			{/if}
		</section>

		<!-- Step 2: Pick a time and invite (only after response) -->
		{#if hasResponse && data.prompt.available_slots.length > 0 && inviteStatus !== 'sent'}
			<section class="invite-section">
				<h2 class="section-title">Pick a time to meet</h2>
				<p class="invite-hint">Your response will be shared with the author as the basis for your conversation.</p>

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

		{#if !hasResponse && data.prompt.available_slots.length > 0}
			<section class="invite-teaser">
				<p class="teaser-text">Write a response to unlock the invitation flow.</p>
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
	.content { width: 100%; max-width: 700px; }

	.back-to-map { display: block; font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 0.85rem; color: var(--text-muted, #666); text-decoration: none; margin-bottom: 16px; }
	.back-to-map:hover { color: var(--text-primary); }

	/* Negative margin must match .main-content padding in (app)/+layout.svelte */
	.cover-wrap { margin: -2rem -2rem 0; }
	.cover { width: 100%; max-height: 400px; object-fit: cover; display: block; }
	@media (max-width: 430px) { .cover-wrap { margin: -1rem -1rem 0; } }

	.title { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 1.8rem; font-weight: normal; color: var(--text-primary); margin: 0 0 8px; line-height: 1.2; }
	.meta { font-family: 'SF Mono', monospace; font-size: 12px; color: var(--text-muted, #999); margin: 0 0 32px; }

	.body { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 15px; line-height: 1.7; color: var(--text-primary); margin-bottom: 40px; }
	.body :global(p) { margin: 0 0 0.75em; }
	.body :global(h1), .body :global(h2) { margin: 1.2em 0 0.5em; font-weight: 500; }
	.body :global(blockquote) { border-left: 2px solid var(--text-muted, #ccc); padding-left: 16px; color: var(--text-muted, #666); }
	.body :global(a) { color: var(--text-link, #555); text-decoration: underline; }
	.body :global(img) { max-width: 100%; border-radius: 4px; }

	.section-title { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 1rem; font-weight: normal; color: var(--text-primary); margin: 0 0 12px; }
	.privacy-hint { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 12px; color: var(--text-muted, #999); font-style: italic; margin: 0 0 12px; }

	.slot-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06)); }
	.slot-item.selected { background: rgba(61,158,90,0.06); margin: 0 -8px; padding: 10px 8px; border-radius: 4px; }
	.slot-info { display: flex; gap: 12px; font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; }
	.slot-date { font-weight: 500; }
	.slot-time, .slot-duration { color: var(--text-muted, #666); }
	.slot-area { font-family: 'SF Mono', monospace; font-size: 11px; text-transform: uppercase; color: var(--text-muted, #aaa); letter-spacing: 0.04em; }
	.select-slot { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; padding: 6px 14px; border: 1px solid var(--border-link); border-radius: 4px; background: none; color: var(--text-primary); cursor: pointer; }
	.select-slot:hover { border-color: var(--text-primary); }
	.invited-badge { font-family: 'SF Mono', monospace; font-size: 11px; color: var(--color-success, #3d9e5a); padding: 6px 14px; }

	.response-section, .invite-section, .invite-teaser, .responses-received { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-link, rgba(0,0,0,0.08)); }

	.response-input { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; width: 100%; padding: 10px 14px; border: 1px solid var(--border-link, rgba(0,0,0,0.12)); border-radius: 6px; background: transparent; color: var(--text-primary); resize: vertical; line-height: 1.6; box-sizing: border-box; margin-bottom: 12px; }
	.response-input:focus { outline: none; border-color: var(--text-muted); }
	.response-input::placeholder { color: var(--text-muted, #999); }

	.response-sent { margin-bottom: 12px; }
	.existing-response { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; color: var(--text-muted, #666); font-style: italic; margin: 8px 0; line-height: 1.5; }
	.edit-response-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 12px; color: var(--text-muted, #666); background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; }

	.invite-hint { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 12px; color: var(--text-muted, #999); margin: 0 0 16px; font-style: italic; }
	.invite-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; padding: 10px 24px; background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: 6px; cursor: pointer; margin-top: 12px; }
	.invite-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.teaser-text { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; color: var(--text-muted, #999); font-style: italic; }

	.submit-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; padding: 8px 20px; border: 1px solid var(--text-primary); border-radius: 6px; background: none; color: var(--text-primary); cursor: pointer; }
	.submit-btn:hover:not(:disabled) { background: var(--text-primary); color: var(--bg-canvas); }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.success { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; color: #3d9e5a; }
	.field-error { font-size: 13px; color: #c00; margin: 0 0 8px; }

	.response-card { padding: 12px 0; border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06)); }
	.response-body { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; color: var(--text-primary); margin: 0 0 4px; line-height: 1.5; }
	.response-date { font-family: 'SF Mono', monospace; font-size: 11px; color: var(--text-muted, #999); }
</style>
