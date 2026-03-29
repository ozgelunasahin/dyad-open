<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { FeedbackFormState, RevealedFeedback } from '$lib/domain/types';
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
				submitError = (err as any).error ?? 'Failed to submit';
			}
		} catch {
			submitError = 'Network error. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Feedback - dyad.berlin</title>
</svelte:head>

<div class="content">
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
			<button class="submit-btn" onclick={handleSubmit} disabled={submitting || !shareWithPerson.trim()}>
				{submitting ? copy.feedback.submitting : copy.feedback.submitFeedback}
			</button>
		</div>
	{/if}

	<div class="sign-out-section">
		<a href="/logout">{copy.nav.signOut}</a>
	</div>
</div>

<style>
	.content { width: 100%; max-width: var(--content-narrow); }
	/* .sign-out-section — shared.css (local override: different padding-bottom) */
	.sign-out-section { padding: var(--space-8) 0; }

	.meeting-context { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-4); }
	.page-title { font-size: var(--text-2xl); font-weight: normal; margin: 0 0 var(--space-2); }
	.desc { font-size: var(--text-base); color: var(--text-muted); margin: 0 0 var(--space-6); }

	/* Met choices */
	.met-choices { display: flex; gap: var(--space-3); }
	.met-btn {
		font-size: var(--text-base);
		padding: var(--space-4) var(--space-8);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: none;
		color: var(--text-primary);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
		flex: 1;
	}
	.met-btn:hover { border-color: var(--text-primary); }
	.met-btn.selected { background: var(--text-primary); color: var(--bg-canvas); border-color: var(--text-primary); }

	/* Tags */
	.tag-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-6); }
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
	.field { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-4); }
	.field label { font-size: var(--text-sm); color: var(--text-muted); }
	.field textarea { font-size: var(--text-base); padding: var(--space-3) var(--space-3); border: 1px solid var(--border-link); border-radius: var(--radius-input); background: transparent; color: var(--text-primary); resize: vertical; line-height: 1.6; width: 100%; box-sizing: border-box; }
	.field textarea:focus { outline: none; border-color: var(--text-muted); }
	.field textarea::placeholder { color: var(--text-muted); }
	.field-error { font-size: var(--text-sm); color: var(--color-danger); margin: 0 0 var(--space-3); }

	/* Actions */
	.actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }
	.back-btn { font-size: var(--text-sm); padding: var(--space-3) var(--space-5); border: 1px solid var(--border-link); border-radius: var(--radius-input); background: none; color: var(--text-muted); cursor: pointer; }
	.submit-btn { font-size: var(--text-base); padding: var(--space-3) var(--space-6); background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: var(--radius-input); cursor: pointer; }
	.submit-btn:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	/* Waiting state */
	.waiting-state { text-align: center; padding: var(--space-10) 0; }
	.waiting-hint { font-size: var(--text-sm); color: var(--text-muted); margin: var(--space-4) 0 var(--space-8); }

	/* Reveal state */
	.reveal-state { padding: var(--space-5) 0; }
	/* .reveal-noshow, .reveal-quote, .reveal-tags, .reveal-tag — shared.css */
	.reveal-card { margin: var(--space-6) 0; }

	/* Shared */
	.continue-link { font-size: var(--text-base); color: var(--text-primary); text-decoration: underline; }
</style>
