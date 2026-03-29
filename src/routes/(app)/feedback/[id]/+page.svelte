<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	let step = $state<'met' | 'rating' | 'done'>(data.form.state === 'submitted' ? 'done' : 'met');
	let didMeet = $state(true);
	let selectedTags = $state<Set<string>>(new Set());
	let freeText = $state('');
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

	async function handleSubmit() {
		submitting = true;
		submitError = '';
		try {
			const res = await fetch(`/api/feedback/${data.form.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					did_meet: didMeet,
					rating_tags: [...selectedTags],
					free_text: freeText.trim() || undefined,
					share_with_person: shareWithPerson.trim() || undefined,
					share_with_platform: shareWithPlatform.trim() || undefined
				})
			});
			if (res.ok) {
				step = 'done';
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
	{#if step === 'done'}
		<div class="done-state">
			<h1 class="page-title">{copy.feedback.thankYou}</h1>
			<p class="desc">{copy.feedback.submitted}</p>
			<a href="/discover" class="continue-link">{copy.feedback.continueToDiscover}</a>
		</div>
	{:else if step === 'met'}
		{#if data.meetingContext}
			<p class="meeting-context">You met @{data.meetingContext.otherUsername} on {data.meetingContext.meetingDate}</p>
		{/if}
		<h1 class="page-title">{copy.feedback.howDidItGo}</h1>

		<div class="met-choices">
			<button class="met-btn" class:selected={didMeet} onclick={() => { didMeet = true; step = 'rating'; }}>
				{copy.feedback.weMet}
			</button>
			<button class="met-btn" class:selected={!didMeet} onclick={() => { didMeet = false; step = 'rating'; }}>
				{copy.feedback.weDidntMeet}
			</button>
		</div>
	{:else if step === 'rating'}
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
			<textarea id="share-person" bind:value={shareWithPerson} rows={3} placeholder={copy.feedback.shareWithPersonHint} required></textarea>
		</div>

		<div class="field">
			<label for="share-platform">{copy.feedback.shareWithPlatform}</label>
			<textarea id="share-platform" bind:value={shareWithPlatform} rows={2}></textarea>
		</div>

		{#if submitError}<p class="field-error">{submitError}</p>{/if}

		<div class="actions">
			<button class="back-btn" onclick={() => step = 'met'}>{copy.common.back}</button>
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
	.content { width: 100%; max-width: 560px; }
	.sign-out-section { padding: var(--space-8) 0; text-align: center; }
	.sign-out-section a { font-size: var(--text-sm); color: var(--text-muted); }

	.meeting-context { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-4); }
	.page-title { font-size: var(--text-2xl); font-weight: normal; margin: 0 0 var(--space-2); }
	.desc {  font-size: 0.9rem; color: var(--text-muted, #666); margin: 0 0 28px; }

	.met-choices { display: flex; gap: 12px; }
	.met-btn {
		
		font-size: 14px;
		padding: 16px 32px;
		border: 1px solid var(--border-link, rgba(0,0,0,0.12));
		border-radius: 8px;
		background: none;
		color: var(--text-primary);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
		flex: 1;
	}
	.met-btn:hover { border-color: var(--text-primary); }
	.met-btn.selected { background: var(--text-primary); color: var(--bg-canvas); border-color: var(--text-primary); }

	.tag-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
	.tag {
		
		font-size: 13px;
		padding: 6px 14px;
		border: 1px solid var(--border-link, rgba(0,0,0,0.12));
		border-radius: 16px;
		background: none;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.15s;
	}
	.tag:hover { border-color: var(--text-primary); }
	.tag.selected { background: var(--text-primary); color: var(--bg-canvas); border-color: var(--text-primary); }

	.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
	.field label {  font-size: 13px; color: var(--text-muted, #666); }
	.field textarea {  font-size: 14px; padding: 10px 14px; border: 1px solid var(--border-link, rgba(0,0,0,0.12)); border-radius: 6px; background: transparent; color: var(--text-primary); resize: vertical; line-height: 1.6; width: 100%; box-sizing: border-box; }
	.field textarea:focus { outline: none; border-color: var(--text-muted); }
	.field textarea::placeholder { color: var(--text-muted, #999); }

	.field-error { font-size: 13px; color: #c00; margin: 0 0 12px; }

	.actions { display: flex; gap: 12px; margin-top: 8px; }
	.back-btn {  font-size: 13px; padding: 10px 20px; border: 1px solid var(--border-link); border-radius: 6px; background: none; color: var(--text-muted); cursor: pointer; }
	.submit-btn {  font-size: 14px; padding: 10px 24px; background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: 6px; cursor: pointer; }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.done-state { text-align: center; padding: 40px 0; }
	.continue-link {  font-size: 14px; color: var(--text-primary); text-decoration: underline; }
</style>
