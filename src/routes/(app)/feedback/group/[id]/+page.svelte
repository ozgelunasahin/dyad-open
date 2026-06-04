<script lang="ts">
	import type { PageData } from './$types';
	import { capture } from '$lib/analytics';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	// 'form' while collecting, 'done' after a successful submit.
	let step = $state<'form' | 'done'>('form');

	let meetAgain = $state<boolean | null>(null);
	let comment = $state('');
	let personalFeedback = $state('');
	let submitting = $state(false);
	let submitError = $state('');

	async function handleSubmit() {
		if (submitting) return; // double-click guard
		if (meetAgain === null) return; // required
		submitting = true;
		submitError = '';
		try {
			const res = await fetch(`/api/feedback/group/${data.form.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					meet_again: meetAgain,
					comment: comment.trim() || undefined,
					personal_feedback: personalFeedback.trim() || undefined
				})
			});
			if (res.ok) {
				capture('group_feedback_submitted');
				step = 'done';
			} else {
				const err = await res.json().catch(() => ({}));
				submitError = (err as { error?: string }).error ?? copy.common.submitFailed;
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
	{#if step === 'done'}
		<!-- ════ DONE ════ -->
		<div class="done-state">
			<h1 class="page-title">{copy.groupFeedback.thankYou}</h1>
			<p class="desc">{copy.groupFeedback.submitted}</p>
			<a href="/discover" class="continue-link">{copy.groupFeedback.continueToDiscover}</a>
		</div>
	{:else}
		<!-- ════ FORM ════ -->
		<h1 class="page-title">{copy.groupFeedback.title}</h1>

		<fieldset class="field">
			<legend>{copy.groupFeedback.meetAgainQuestion}</legend>
			<div class="choices">
				<button
					type="button"
					class="choice"
					class:selected={meetAgain === true}
					onclick={() => (meetAgain = true)}
				>{copy.groupFeedback.yes}</button>
				<button
					type="button"
					class="choice"
					class:selected={meetAgain === false}
					onclick={() => (meetAgain = false)}
				>{copy.groupFeedback.no}</button>
			</div>
		</fieldset>

		<div class="field">
			<label for="comment">{copy.groupFeedback.commentLabel}</label>
			<textarea
				id="comment"
				bind:value={comment}
				rows={3}
				placeholder={copy.groupFeedback.commentPlaceholder}
				maxlength={2000}
			></textarea>
		</div>

		<div class="field">
			<label for="personal-feedback">{copy.groupFeedback.personalFeedbackLabel}</label>
			<textarea
				id="personal-feedback"
				bind:value={personalFeedback}
				rows={3}
				placeholder={copy.groupFeedback.personalFeedbackPlaceholder}
				maxlength={2000}
			></textarea>
		</div>

		{#if submitError}<p class="field-error">{submitError}</p>{/if}

		<button
			class="btn-primary"
			onclick={handleSubmit}
			disabled={submitting || meetAgain === null}
		>
			{submitting ? copy.groupFeedback.submitting : copy.groupFeedback.submit}
		</button>
	{/if}

	<div class="sign-out-section">
		<form method="POST" action="/logout" class="sign-out-form">
			<button type="submit">{copy.nav.signOut}</button>
		</form>
	</div>
</div>

<style>
	/* Card layout — matches the one-on-one feedback page. */
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

	.page-title { font-size: var(--text-xl); font-weight: 500; margin: 0; }
	.desc { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }

	/* meet-again choices */
	.field { display: flex; flex-direction: column; gap: var(--space-2); border: none; padding: 0; margin: 0; }
	.field legend, .field label { font-size: var(--text-sm); color: var(--text-muted); padding: 0; }

	.choices { display: flex; gap: var(--space-3); }
	.choice {
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
	.choice:hover { border-color: var(--text-primary); }
	.choice.selected { background: var(--text-primary); color: var(--bg-canvas); border-color: var(--text-primary); }

	/* textareas */
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

	/* .btn-primary lives in shared.css */

	.done-state { display: flex; flex-direction: column; gap: var(--space-3); }
	.continue-link { font-size: var(--text-base); color: var(--text-primary); text-decoration: underline; }

	.sign-out-section {
		padding: var(--space-6) 0 0;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
	.sign-out-section button { color: var(--text-muted); text-decoration: underline; }
	.sign-out-section .sign-out-form { margin: 0; padding: 0; }
	.sign-out-section button { background: none; border: none; cursor: pointer; font: inherit; }
</style>
