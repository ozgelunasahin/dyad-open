<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let commentText = $state(data.myComment?.body ?? '');
	let commentStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let commentError = $state('');

	let selectedSlotId = $state<string | null>(null);
	let inviteMessage = $state('');
	let inviteStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');

	function formatSlotDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function formatSlotTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	async function submitComment() {
		if (!commentText.trim()) return;
		commentStatus = 'sending';
		commentError = '';
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: commentText.trim() })
			});
			if (res.ok) { commentStatus = 'sent'; }
			else {
				const err = await res.json().catch(() => ({}));
				commentError = (err as any).error ?? 'Failed to send';
				commentStatus = 'error';
			}
		} catch {
			commentError = 'Network error';
			commentStatus = 'error';
		}
	}

	async function sendInvite() {
		if (!selectedSlotId) return;
		inviteStatus = 'sending';
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/invitations`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slotId: selectedSlotId, message: inviteMessage.trim() || undefined })
			});
			if (res.ok) { inviteStatus = 'sent'; }
			else { inviteStatus = 'error'; }
		} catch {
			inviteStatus = 'error';
		}
	}

	let isOwnPrompt = $derived(data.prompt.author_id === data.user?.id);
</script>

<svelte:head>
	<title>{data.prompt.title ?? 'Prompt'} - dyad.berlin</title>
</svelte:head>

<div class="content">
	{#if data.prompt.cover_image_url}
		<img src={data.prompt.cover_image_url} alt="" class="cover" loading="lazy" />
	{/if}

	<h1 class="title">{data.prompt.title}</h1>
	<p class="meta">by @{data.prompt.author_username}</p>

	<div class="body">
		{@html data.prompt.body_html}
	</div>

	<!-- Available slots -->
	{#if data.prompt.available_slots.length > 0}
		<section class="slots-section">
			<h2 class="section-title">Available times</h2>
			{#each data.prompt.available_slots as slot}
				<div class="slot-item" class:selected={selectedSlotId === slot.id}>
					<div class="slot-info">
						<span class="slot-date">{formatSlotDate(slot.start_time)}</span>
						<span class="slot-time">{formatSlotTime(slot.start_time)}</span>
						<span class="slot-duration">{slot.duration_minutes} min</span>
						<span class="slot-area">{slot.general_area}</span>
					</div>
					{#if !isOwnPrompt && inviteStatus !== 'sent'}
						<button class="select-slot" onclick={() => selectedSlotId = selectedSlotId === slot.id ? null : slot.id}>
							{selectedSlotId === slot.id ? 'Selected' : 'Select'}
						</button>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	<!-- Comment form (non-authors only) -->
	{#if !isOwnPrompt}
		<section class="comment-section">
			<h2 class="section-title">Leave a note</h2>
			<p class="privacy-hint">Only visible to you and the prompt author.</p>

			{#if commentStatus === 'sent'}
				<p class="success">Your note was sent.</p>
			{:else}
				<textarea
					class="comment-input"
					placeholder="What resonates with you about this prompt?"
					bind:value={commentText}
					rows={3}
					disabled={commentStatus === 'sending'}
				></textarea>
				{#if commentError}<p class="field-error">{commentError}</p>{/if}
				<button class="submit-btn" onclick={submitComment} disabled={commentStatus === 'sending' || !commentText.trim()}>
					{commentStatus === 'sending' ? 'Sending...' : (data.myComment ? 'Update note' : 'Send note')}
				</button>
			{/if}
		</section>

		<!-- Invite flow -->
		{#if selectedSlotId}
			<section class="invite-section">
				<h2 class="section-title">Invite to meet</h2>
				{#if inviteStatus === 'sent'}
					<p class="success">Invitation sent! The author will be notified.</p>
				{:else}
					<textarea
						class="comment-input"
						placeholder="Add a message (optional)"
						bind:value={inviteMessage}
						rows={2}
						disabled={inviteStatus === 'sending'}
					></textarea>
					<button class="publish-btn" onclick={sendInvite} disabled={inviteStatus === 'sending'}>
						{inviteStatus === 'sending' ? 'Sending...' : 'Send invitation'}
					</button>
				{/if}
			</section>
		{/if}
	{/if}

	<!-- Author view: comments received -->
	{#if isOwnPrompt && data.comments.length > 0}
		<section class="comments-received">
			<h2 class="section-title">Notes received</h2>
			{#each data.comments as comment}
				<div class="comment-card">
					<p class="comment-body">{comment.body}</p>
					<span class="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	.content { width: 100%; max-width: 700px; }

	.cover { width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 24px; }

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

	.slots-section { margin-bottom: 32px; padding-top: 24px; border-top: 1px solid var(--border-link, rgba(0,0,0,0.08)); }
	.slot-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06)); }
	.slot-item.selected { background: rgba(61,158,90,0.06); margin: 0 -8px; padding: 10px 8px; border-radius: 4px; }
	.slot-info { display: flex; gap: 12px; font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; }
	.slot-date { font-weight: 500; }
	.slot-time, .slot-duration { color: var(--text-muted, #666); }
	.slot-area { font-family: 'SF Mono', monospace; font-size: 11px; text-transform: uppercase; color: var(--text-muted, #aaa); letter-spacing: 0.04em; }
	.select-slot { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; padding: 6px 14px; border: 1px solid var(--border-link); border-radius: 4px; background: none; color: var(--text-primary); cursor: pointer; }
	.select-slot:hover { border-color: var(--text-primary); }

	.comment-section, .invite-section, .comments-received { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-link, rgba(0,0,0,0.08)); }

	.comment-input { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; width: 100%; padding: 10px 14px; border: 1px solid var(--border-link, rgba(0,0,0,0.12)); border-radius: 6px; background: transparent; color: var(--text-primary); resize: vertical; line-height: 1.6; box-sizing: border-box; margin-bottom: 12px; }
	.comment-input:focus { outline: none; border-color: var(--text-muted); }
	.comment-input::placeholder { color: var(--text-muted, #999); }

	.submit-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; padding: 8px 20px; border: 1px solid var(--text-primary); border-radius: 6px; background: none; color: var(--text-primary); cursor: pointer; }
	.submit-btn:hover:not(:disabled) { background: var(--text-primary); color: var(--bg-canvas); }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.publish-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; padding: 10px 24px; background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: 6px; cursor: pointer; }
	.publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.success { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; color: #3d9e5a; }
	.field-error { font-size: 13px; color: #c00; margin: 0 0 8px; }

	.comment-card { padding: 12px 0; border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06)); }
	.comment-body { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; color: var(--text-primary); margin: 0 0 4px; line-height: 1.5; }
	.comment-date { font-family: 'SF Mono', monospace; font-size: 11px; color: var(--text-muted, #999); }
</style>
