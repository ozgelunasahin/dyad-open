<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { copy } from '$lib/copy';
	import { capture } from '$lib/analytics';

	interface Props {
		formId: string;
		meetingId: string;
		initialState: string;
		vocabulary: string[];
		meetingContext: { otherUsername: string; meetingDate: string } | null;
	}

	let { formId, meetingId, initialState, vocabulary, meetingContext }: Props = $props();

	let dialog = $state<HTMLDialogElement | undefined>();

	// ── Step state ───────────────────────────────────────────────────────
	type Step = 'met' | 'rating' | 'waiting' | 'reveal';

	function initialStep(state: string): Step {
		if (state === 'locked' || state === 'released') return 'reveal';
		if (state === 'submitted') return 'waiting';
		return 'met';
	}

	let userStep = $state<Step | null>(null);
	let effectiveStep = $derived(userStep ?? initialStep(initialState));

	// ── Form fields ──────────────────────────────────────────────────────
	let didMeet = $state(true);
	let selectedTags = $state<Set<string>>(new Set());
	let shareWithPerson = $state('');
	let shareWithPlatform = $state('');
	let submitting = $state(false);
	let submitError = $state('');

	type RevealEntry = { did_meet: boolean | null; rating_tags: string[]; share_with_person: string | null };
	let revealedFeedback = $state<RevealEntry[]>([]);

	function toggleTag(tag: string) {
		const next = new Set(selectedTags);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		selectedTags = next;
	}

	onMount(() => {
		dialog?.showModal();

		// If waiting, poll once to catch the case where other party already submitted
		if (effectiveStep === 'waiting') {
			fetch(`/api/feedback/${formId}`)
				.then(r => r.ok ? r.json() : null)
				.then(form => {
					if (form?.state === 'locked' || form?.state === 'released') {
						invalidateAll();
					}
				})
				.catch(() => {/* ignore */});
		}
	});

	async function handleSubmit() {
		if (submitting) return;
		submitting = true;
		submitError = '';
		try {
			const res = await fetch(`/api/feedback/${formId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					did_meet: didMeet,
					rating_tags: [...selectedTags],
					share_with_person: shareWithPerson.trim() || undefined,
					share_with_platform: shareWithPlatform.trim() || undefined
				})
			});
			if (res.ok) {
				const result = await res.json();
				capture('meeting_feedback_submitted', { meeting_id: meetingId, did_meet: didMeet });
				if ((result.state === 'locked' || result.state === 'released') && result.revealed) {
					revealedFeedback = result.revealed;
					userStep = 'reveal';
				} else {
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

	async function dismiss() {
		dialog?.close();
		await invalidateAll();
	}
</script>

<dialog bind:this={dialog} class="feedback-dialog" aria-labelledby="feedback-dialog-title">
	<div class="dialog-inner">

		{#if effectiveStep === 'reveal'}
			<h2 id="feedback-dialog-title" class="title">{copy.feedback.thankYou}</h2>
			{#if meetingContext}
				<p class="meta">Your meeting with @{meetingContext.otherUsername}</p>
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
			<button class="submit-btn" onclick={dismiss}>Continue</button>

		{:else if effectiveStep === 'waiting'}
			<h2 id="feedback-dialog-title" class="title">{copy.feedback.thankYou}</h2>
			<p class="desc">{copy.feedback.submitted}</p>
			<p class="desc muted">You'll see what they shared once they submit theirs.</p>
			<button class="submit-btn" onclick={dismiss}>Continue to discover</button>

		{:else if effectiveStep === 'met'}
			{#if meetingContext}
				<p class="meta">You met @{meetingContext.otherUsername} on {meetingContext.meetingDate}</p>
			{/if}
			<h2 id="feedback-dialog-title" class="title">{copy.feedback.howDidItGo}</h2>
			<div class="met-choices">
				<button class="met-btn" class:selected={didMeet} onclick={() => { didMeet = true; userStep = 'rating'; }}>
					{copy.feedback.weMet}
				</button>
				<button class="met-btn" class:selected={!didMeet} onclick={() => { didMeet = false; userStep = 'rating'; }}>
					{copy.feedback.weDidntMeet}
				</button>
			</div>

		{:else if effectiveStep === 'rating'}
			<h2 id="feedback-dialog-title" class="title">{didMeet ? copy.feedback.howDidItGo : copy.feedback.whatHappened}</h2>

			{#if didMeet && vocabulary.length > 0}
				<p class="desc">{copy.feedback.selectTags}</p>
				<div class="tag-grid">
					{#each vocabulary as tag}
						<button class="tag" class:selected={selectedTags.has(tag)} onclick={() => toggleTag(tag)}>{tag}</button>
					{/each}
				</div>
			{/if}

			<div class="field">
				<label for="share-person">{didMeet ? copy.feedback.shareWithPerson : copy.feedback.whatHappened}</label>
				<textarea id="share-person" bind:value={shareWithPerson} rows={3}
					placeholder={copy.feedback.shareWithPersonHint} maxlength={2000}></textarea>
			</div>

			<div class="field">
				<label for="share-platform">{copy.feedback.shareWithPlatform}</label>
				<textarea id="share-platform" bind:value={shareWithPlatform} rows={2} maxlength={2000}></textarea>
			</div>

			{#if submitError}<p class="field-error">{submitError}</p>{/if}

			<div class="actions">
				<button class="back-btn" onclick={() => userStep = 'met'}>{copy.common.back}</button>
				<button class="submit-btn" onclick={handleSubmit}
					disabled={submitting || !shareWithPerson.trim()}>
					{submitting ? copy.feedback.submitting : copy.feedback.submitFeedback}
				</button>
			</div>
		{/if}

	</div>
</dialog>

<style>
	.feedback-dialog {
		border: none;
		border-radius: var(--radius-card);
		padding: 0;
		max-width: 440px;
		width: calc(100% - var(--space-8));
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.22);
	}

	.feedback-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	.dialog-inner {
		padding: var(--space-8) var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.meta {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0;
	}

	.title {
		font-size: var(--text-2xl);
		font-weight: normal;
		margin: 0;
	}

	.desc {
		font-size: var(--text-base);
		color: var(--text-muted);
		margin: 0;
	}
	.desc.muted { font-size: var(--text-sm); }

	/* Met choices */
	.met-choices { display: flex; gap: var(--space-3); }
	.met-btn {
		flex: 1;
		font-size: var(--text-base);
		padding: var(--space-4) var(--space-4);
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

	/* Fields */
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
	.submit-btn {
		flex: 1;
		font-size: var(--text-base);
		padding: var(--space-3) var(--space-6);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-input);
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.submit-btn:hover { opacity: var(--opacity-hover-btn); }
	.submit-btn:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	/* Reveal */
	.reveal-card { padding: var(--space-4) 0; border-top: 1px solid var(--border-link); }
	.reveal-noshow { font-size: var(--text-sm); color: var(--text-muted); margin: 0 0 var(--space-2); }
	.reveal-quote {
		font-size: var(--text-base);
		line-height: 1.6;
		border-left: 2px solid var(--border-link);
		padding-left: var(--space-3);
		margin: 0 0 var(--space-3);
		color: var(--text-primary);
	}
	.reveal-tags { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
	.reveal-tag {
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		color: var(--text-muted);
	}
</style>
