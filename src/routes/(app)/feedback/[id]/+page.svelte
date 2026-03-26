<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

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
			<h1 class="page-title">Thank you</h1>
			<p class="desc">Your feedback has been submitted.</p>
			<a href="/discover" class="continue-link">Continue to discover</a>
		</div>
	{:else if step === 'met'}
		<h1 class="page-title">How did it go?</h1>
		<p class="desc">Your feedback helps build trust in the community.</p>

		<div class="met-choices">
			<button class="met-btn" class:selected={didMeet} onclick={() => { didMeet = true; step = 'rating'; }}>
				We met
			</button>
			<button class="met-btn" class:selected={!didMeet} onclick={() => { didMeet = false; step = 'rating'; }}>
				We didn't meet
			</button>
		</div>
	{:else if step === 'rating'}
		<h1 class="page-title">{didMeet ? 'How was it?' : 'What happened?'}</h1>

		{#if didMeet && data.vocabulary.length > 0}
			<p class="desc">Select any that apply:</p>
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
			<label for="freetext">{didMeet ? 'Anything else?' : 'What happened?'}</label>
			<textarea id="freetext" bind:value={freeText} rows={3} placeholder="Optional — share your thoughts"></textarea>
		</div>

		<div class="field">
			<label for="share-person">Share with the other person (they'll see this after submitting their own feedback)</label>
			<textarea id="share-person" bind:value={shareWithPerson} rows={2} placeholder="Optional"></textarea>
		</div>

		<div class="field">
			<label for="share-platform">Share with dyad (helps us improve)</label>
			<textarea id="share-platform" bind:value={shareWithPlatform} rows={2} placeholder="Optional"></textarea>
		</div>

		{#if submitError}<p class="field-error">{submitError}</p>{/if}

		<div class="actions">
			<button class="back-btn" onclick={() => step = 'met'}>Back</button>
			<button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
				{submitting ? 'Submitting...' : 'Submit feedback'}
			</button>
		</div>
	{/if}
</div>

<style>
	.content { width: 100%; max-width: 560px; }

	.page-title { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 1.5rem; font-weight: normal; color: var(--text-primary); margin: 0 0 8px; }
	.desc { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 0.9rem; color: var(--text-muted, #666); margin: 0 0 28px; }

	.met-choices { display: flex; gap: 12px; }
	.met-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
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
		font-family: 'SangBleu Sunrise', Georgia, serif;
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
	.field label { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; color: var(--text-muted, #666); }
	.field textarea { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; padding: 10px 14px; border: 1px solid var(--border-link, rgba(0,0,0,0.12)); border-radius: 6px; background: transparent; color: var(--text-primary); resize: vertical; line-height: 1.6; width: 100%; box-sizing: border-box; }
	.field textarea:focus { outline: none; border-color: var(--text-muted); }
	.field textarea::placeholder { color: var(--text-muted, #999); }

	.field-error { font-size: 13px; color: #c00; margin: 0 0 12px; }

	.actions { display: flex; gap: 12px; margin-top: 8px; }
	.back-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; padding: 10px 20px; border: 1px solid var(--border-link); border-radius: 6px; background: none; color: var(--text-muted); cursor: pointer; }
	.submit-btn { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; padding: 10px 24px; background: var(--text-primary); color: var(--bg-canvas); border: 1px solid var(--text-primary); border-radius: 6px; cursor: pointer; }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.done-state { text-align: center; padding: 40px 0; }
	.continue-link { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 14px; color: var(--text-primary); text-decoration: underline; }
</style>
