<script lang="ts">
	import { goto } from '$app/navigation';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();
	let cancelling = $state(false);
	let cancelDialog = $state<ConfirmDialog | undefined>();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}

	async function handleCancel() {
		cancelling = true;
		try {
			const res = await fetch(`/api/meetings/${data.meeting.id}/cancel`, { method: 'POST' });
			if (res.ok) goto('/profile');
		} finally {
			cancelling = false;
		}
	}
</script>

<svelte:head>
	<title>Meeting with @{data.otherUsername} - dyad.berlin</title>
</svelte:head>

<div class="content">
	<div class="meeting-header">
		<span class="meeting-with">{copy.profile.meetingWith(data.otherUsername)}</span>
		<span class="meeting-when">{formatDate(data.meeting.scheduled_time)}</span>
	</div>

	<div class="detail-grid">
		<div class="detail-row">
			<span class="label">{copy.meeting.duration}</span>
			<span class="value">{data.meeting.duration_minutes} {copy.meeting.minutes}</span>
		</div>
		<div class="detail-row">
			<span class="label">{copy.meeting.area}</span>
			<span class="value">{data.meeting.general_area}</span>
		</div>
		{#if 'exact_location' in data.meeting && data.meeting.exact_location}
			<div class="detail-row">
				<span class="label">{copy.meeting.location}</span>
				<span class="value location">{data.meeting.exact_location.name}<br /><span class="addr">{data.meeting.exact_location.address}</span></span>
			</div>
		{/if}
	</div>

	{#if data.invitationMessage}
		<div class="invitation-note">
			<span class="note-label">{copy.meeting.invitationNote}</span>
			<p class="note-body">{data.invitationMessage}</p>
		</div>
	{/if}

	{#if data.prompt}
		<a href="/conversations/{data.prompt.id}" class="prompt-item">
			<div class="prompt-row">
				<div class="row-thumb">
					{#if data.prompt.cover_image_url}
						<img src={data.prompt.cover_image_url} alt="" class="thumb-img" />
					{:else}
						<div class="thumb-placeholder"></div>
					{/if}
				</div>
				<div class="row-body">
					<h3 class="row-title">{data.prompt.title || copy.common.untitled}</h3>
					<span class="row-status">{data.prompt.published_at ? formatDate(data.prompt.published_at) : ''}</span>
				</div>
			</div>
		</a>
	{/if}

	<!-- Feedback status for awaiting_feedback meetings -->
	{#if data.meeting.state === 'awaiting_feedback' && data.myFeedbackForm}
		<section class="feedback-status">
			{#if data.myFeedbackForm.state === 'due'}
				<p class="feedback-prompt">You have feedback to submit</p>
				<a href="/feedback/{data.myFeedbackForm.id}" class="btn-primary">Give feedback</a>
			{:else if data.myFeedbackForm.state === 'submitted'}
				<p class="feedback-waiting">Feedback submitted — waiting for the other person</p>
			{/if}
		</section>
	{/if}

	<!-- Revealed feedback for completed meetings -->
	{#if data.revealedFeedback && data.revealedFeedback.length > 0}
		<section class="revealed-section">
			<h2 class="section-title">What they shared with you</h2>
			{#each data.revealedFeedback as fb}
				<div class="reveal-card">
					{#if fb.did_meet === false}
						<p class="reveal-noshow">They reported you didn't meet</p>
					{/if}
					{#if fb.share_with_person}
						<blockquote class="reveal-quote">{fb.share_with_person}</blockquote>
					{/if}
					{#if fb.rating_tags.length > 0}
						<ul class="reveal-tags" role="list">
							{#each fb.rating_tags as tag}
								<li class="reveal-tag">{tag}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</section>
	{/if}

	{#if data.meeting.state === 'scheduled'}
		<button class="cancel-btn" onclick={() => cancelDialog?.open()} disabled={cancelling}>
			{cancelling ? copy.meeting.cancelling : copy.meeting.cancelMeeting}
		</button>
		<ConfirmDialog
			bind:this={cancelDialog}
			title={copy.meeting.cancelMeeting}
			message={copy.meeting.cancelConfirm}
			confirmLabel={copy.meeting.cancelMeeting}
			onConfirm={handleCancel}
		/>
	{/if}
</div>

<FloatingNav variant="default" attentionCount={data.attentionCount ?? 0} />

<style>
	.content { width: 100%; max-width: var(--content-narrow); }

	.meeting-header { margin-bottom: var(--space-6); }
	.meeting-with { font-size: var(--text-2xl); font-weight: normal; display: block; line-height: var(--leading-tight); }
	.meeting-when { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-top: var(--space-2); }

	.detail-grid { display: flex; flex-direction: column; margin-bottom: var(--space-6); }
	.detail-row { display: flex; gap: var(--space-4); padding: var(--space-3) 0; border-bottom: 1px solid var(--border-link); }
	.label { font-size: var(--text-sm); color: var(--text-muted); width: 80px; flex-shrink: 0; }
	.value { font-size: var(--text-base); }
	.location { font-weight: 500; }
	.addr { font-size: var(--text-xs); color: var(--text-muted); font-weight: normal; }

	.invitation-note { margin-bottom: var(--space-6); }
	.note-label { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); display: block; margin-bottom: var(--space-1); }
	.note-body { font-size: var(--text-md); line-height: var(--leading-normal); margin: 0; font-style: italic; color: var(--text-secondary); }

	.prompt-item { display: block; border: 1px solid var(--border-link); border-radius: var(--radius-card); margin-bottom: var(--space-6); transition: opacity 0.15s; }
	.prompt-item:hover { opacity: var(--opacity-hover-card); }
	/* .row-thumb, .thumb-img, .row-body, .row-title, .row-status — shared.css */
	.prompt-row { padding: var(--space-4); }
	.thumb-placeholder { position: absolute; inset: 0; background: var(--bg-control); }

	/* Feedback status */
	.feedback-status { margin-bottom: var(--space-6); padding: var(--space-4); border: 1px solid var(--border-link); border-radius: var(--radius-card); }
	.feedback-prompt { font-size: var(--text-md); font-weight: 500; margin: 0 0 var(--space-3); }
	.feedback-waiting { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }

	/* Revealed feedback */
	.revealed-section { margin-bottom: var(--space-6); }
	.section-title { margin: 0 0 var(--space-4); }
	/* .reveal-card, .reveal-noshow, .reveal-quote, .reveal-tags, .reveal-tag — shared.css */

	.cancel-btn { font-size: var(--text-sm); padding: var(--space-2) var(--space-5); border: 1px solid var(--border-link); border-radius: var(--radius-input); background: none; color: var(--text-muted); cursor: pointer; }
	.cancel-btn:hover { border-color: var(--color-danger); color: var(--color-danger); }
	.cancel-btn:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }
</style>
