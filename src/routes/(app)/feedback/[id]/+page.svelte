<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { FeedbackFormState, RevealedFeedback } from '$lib/domain/types';
	import { capture } from '$lib/analytics';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	// ── 4-step state machine ────────────────────────────────────────────
	type FeedbackStep = 'met' | 'rating' | 'waiting' | 'reveal';

	function initialStep(state: FeedbackFormState): FeedbackStep {
		if (state === 'locked' || state === 'released') return 'reveal';
		if (state === 'submitted') return 'waiting';
		return 'met'; // 'due' — 'not_due' handled by server redirect
	}

	let userStep = $state<FeedbackStep | null>(null);
	let effectiveStep = $derived(userStep ?? initialStep(data.form.state));

	// Revealed feedback — from server (locked on load) or from PATCH response
	// svelte-ignore state_referenced_locally — intentional: server value captured, then updated via PATCH response
	let revealedFeedback = $state<RevealedFeedback[]>(data.revealedFeedback ?? []);

	// ── Form state ──────────────────────────────────────────────────────
	let didMeet = $state(true);
	let selectedTags = $state<Set<string>>(new Set());
	let shareWithPerson = $state('');
	let shareWithPlatform = $state('');
	let submitting = $state(false);
	let submitError = $state('');

	function toggleTag(tag: string) {
		const next = new Set(selectedTags);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		selectedTags = next;
	}

	// ── Catch-up check: detect post-hydration lock ──────────────────────
	onMount(async () => {
		if (effectiveStep !== 'waiting') return;
		try {
			const res = await fetch(`/api/feedback/${data.form.id}`);
			if (!res.ok) return;
			const form = await res.json();
			if (form.state === 'locked' || form.state === 'released') {
				// Other party submitted between server load and hydration — reload page
				// invalidateAll() re-runs the server loader which loads revealedFeedback
				const { invalidateAll } = await import('$app/navigation');
				await invalidateAll();
			}
		} catch { /* ignore — not critical */ }
	});

	// ── Submit handler ──────────────────────────────────────────────────
	async function handleSubmit() {
		if (submitting) return; // double-click guard
		submitting = true;
		submitError = '';
		try {
			const res = await fetch(`/api/feedback/${data.form.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					did_meet: didMeet,
					rating_tags: [...selectedTags],
					free_text: undefined,
					share_with_person: shareWithPerson.trim() || undefined,
					share_with_platform: shareWithPlatform.trim() || undefined
				})
			});
			if (res.ok) {
				capture('feedback_submitted');
				const result = await res.json();
				if (result.state === 'locked' && result.revealed) {
					// Both submitted — show reveal immediately
					// data.form.state is stale (still 'due') until next navigation, so set step explicitly
					revealedFeedback = result.revealed;
					userStep = 'reveal';
				} else {
					// Only we submitted — show waiting
					userStep = 'waiting';
				}
			} else {
				const err = await res.json().catch(() => ({}));
				submitError = (err as any).error ?? copy.common.submitFailed;
			}
		} catch {
			submitError = copy.common.networkError;
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Feedback - dyad.berlin</title>
</svelte:head>

<div class="content">
	<button class="close-btn" onclick={() => history.back()} aria-label="Close">&times;</button>

	{#if effectiveStep === 'reveal'}
		<!-- ════ REVEAL: show what they shared ════ -->
		<div class="reveal-state">
			<h1 class="page-title">{copy.feedback.thankYou}</h1>
			{#if data.meetingContext}
				<p class="meeting-context">Your meeting with @{data.meetingContext.otherUsername}</p>
			{/if}

			{#if revealedFeedback.length > 0}
				{#each revealedFeedback as fb}
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
			{:else}
				<p class="desc">Feedback has been submitted.</p>
			{/if}

			<a href="/discover" class="continue-link">{copy.feedback.continueToDiscover}</a>
		</div>

	{:else if effectiveStep === 'waiting'}
		<!-- ════ WAITING: submitted, other party hasn't yet ════ -->
		<div class="waiting-state">
			<h1 class="page-title">{copy.feedback.thankYou}</h1>
			<p class="desc">{copy.feedback.submitted}</p>
			<p class="waiting-hint">You'll see what they shared once they submit theirs.</p>
			<a href="/discover" class="continue-link">{copy.feedback.continueToDiscover}</a>
		</div>

	{:else if effectiveStep === 'met'}
		<!-- ════ STEP 1: Did you meet? ════ -->
		{#if data.meetingContext}
			<p class="meeting-context">You met @{data.meetingContext.otherUsername} on {data.meetingContext.meetingDate}</p>
		{/if}
		<h1 class="page-title">{copy.feedback.howDidItGo}</h1>

		<div class="met-choices">
			<button class="met-btn" class:selected={didMeet} onclick={() => { didMeet = true; userStep = 'rating'; }}>
				{copy.feedback.weMet}
			</button>
			<button class="met-btn" class:selected={!didMeet} onclick={() => { didMeet = false; userStep = 'rating'; }}>
				{copy.feedback.weDidntMeet}
			</button>
		</div>

	{:else if effectiveStep === 'rating'}
		<!-- ════ STEP 2: Rating + share ════ -->
		<h1 class="page-title">{didMeet ? copy.feedback.howDidItGo : copy.feedback.whatHappened}</h1>

		{#if didMeet && data.vocabulary.length > 0}
			<p class="desc">{copy.feedback.selectTags}</p>
			<div class="tag-grid">
				{#each data.vocabulary as tag}
					<button
						class="tag"
						class:selected={selectedTags.has(tag)}
						onclick={() => toggleTag(tag)}
					>{tag}</button>
				{/each}
			</div>
		{/if}

		<div class="field">
			<label for="share-person">{didMeet ? copy.feedback.shareWithPerson : copy.feedback.whatHappened}</label>
			<textarea id="share-person" bind:value={shareWithPerson} rows={3} placeholder={copy.feedback.shareWithPersonHint} maxlength={2000} required></textarea>
		</div>

		<div class="field">
			<label for="share-platform">{copy.feedback.shareWithPlatform}</label>
			<textarea id="share-platform" bind:value={shareWithPlatform} rows={2} maxlength={2000}></textarea>
		</div>

		{#if submitError}<p class="field-error">{submitError}</p>{/if}

		<div class="actions">
			<button class="back-btn" onclick={() => userStep = 'met'}>{copy.common.back}</button>
			<button class="btn-primary flex-1" onclick={handleSubmit} disabled={submitting || !shareWithPerson.trim()}>
				{submitting ? copy.feedback.submitting : copy.feedback.submitFeedback}
			</button>
		</div>
	{/if}

	<div class="sign-out-section">
		<form method="POST" action="/logout" class="sign-out-form">
			<button type="submit">{copy.nav.signOut}</button>
		</form>
	</div>
</div>

<style>
	/* Close button */
	.close-btn {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		background: none;
		border: none;
		font-size: var(--text-2xl);
		color: var(--text-muted);
		cursor: pointer;
		line-height: 1;
		padding: var(--space-1);
	}
	.close-btn:hover { color: var(--text-primary); }

	/* Card layout — matches AuthDialog style */
	.content {
		position: relative;
		width: 100%;
		max-width: 420px;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		padding: var(--space-8) var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-top: var(--space-10);
	}

	.sign-out-section {
		padding: var(--space-6) 0 0;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.sign-out-section a,
	.sign-out-section button { color: var(--text-muted); text-decoration: underline; }
	.sign-out-section .sign-out-form { margin: 0; padding: 0; }
	.sign-out-section button { background: none; border: none; cursor: pointer; font: inherit; }

	.meeting-context { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0; }
	.page-title { font-size: var(--text-xl); font-weight: 500; margin: 0; }
	.desc { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }

	/* Met choices */
	.met-choices { display: flex; gap: var(--space-3); }
	.met-btn {
		flex: 1;
		font-size: var(--text-base);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: none;
		color: var(--text-primary);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.met-btn:hover { border-color: var(--text-primary); }
	.met-btn.selected { background: var(--text-primary); color: var(--bg-canvas); border-color: var(--text-primary); }

	/* Tags */
	.tag-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
	.tag {
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		background: none;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.15s;
	}
	.tag:hover { border-color: var(--text-primary); }
	.tag.selected { background: var(--text-primary); color: var(--bg-canvas); border-color: var(--text-primary); }

	/* Form fields */
	.field { display: flex; flex-direction: column; gap: var(--space-1); }
	.field label { font-size: var(--text-sm); color: var(--text-muted); }
	.field textarea {
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		resize: vertical;
		line-height: 1.6;
		width: 100%;
		box-sizing: border-box;
	}
	.field textarea:focus { outline: none; border-color: var(--text-muted); }
	.field textarea::placeholder { color: var(--text-muted); }
	.field-error { font-size: var(--text-sm); color: var(--color-danger); margin: 0; }

	/* Actions */
	.actions { display: flex; gap: var(--space-3); }
	.back-btn {
		font-size: var(--text-sm);
		padding: var(--space-3) var(--space-5);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: none;
		color: var(--text-muted);
		cursor: pointer;
	}
	/* .btn-primary lives in shared.css; .flex-1 is a local utility for the dialog footer. */
	.flex-1 { flex: 1; }

	/* Waiting state */
	.waiting-state { display: flex; flex-direction: column; gap: var(--space-3); }
	.waiting-hint { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }

	/* Reveal state */
	.reveal-state { display: flex; flex-direction: column; gap: var(--space-4); }
	.reveal-card { padding: var(--space-4) 0; border-top: 1px solid var(--border-link); }
	/* .reveal-noshow, .reveal-quote, .reveal-tags, .reveal-tag — shared.css */

	/* Shared */
	.continue-link { font-size: var(--text-base); color: var(--text-primary); text-decoration: underline; }
</style>
