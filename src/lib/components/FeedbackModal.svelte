<script lang="ts">
	interface Props {
		meetingId: string;
		otherUsername: string;
		onclose: () => void;
		onsubmitted: () => void;
	}

	let { meetingId, otherUsername, onclose, onsubmitted }: Props = $props();

	const TAGS = [
		'showed up',
		'thoughtful',
		'good listener',
		'curious',
		'open-minded',
		'punctual',
		'warm'
	];

	let step = $state<'met' | 'how-was-it' | 'done'>('met');
	let selectedTags = $state<Set<string>>(new Set());
	let note = $state('');
	let submitting = $state(false);
	let error = $state('');

	function toggleTag(tag: string) {
		const next = new Set(selectedTags);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		selectedTags = next;
	}

	async function submitFeedback() {
		if (submitting) return;
		submitting = true;
		error = '';
		try {
			const res = await fetch('/api/meeting-feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					meeting_id: meetingId,
					did_meet: true,
					tags: [...selectedTags],
					body: note.trim() || null
				})
			});
			if (res.ok) {
				step = 'done';
				setTimeout(() => onsubmitted(), 1600);
			} else {
				const data = await res.json().catch(() => ({}));
				error = (data as any).message ?? 'Something went wrong';
			}
		} finally {
			submitting = false;
		}
	}

	async function answerMet(answer: boolean) {
		if (!answer) {
			submitting = true;
			error = '';
			try {
				const res = await fetch('/api/meeting-feedback', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ meeting_id: meetingId, did_meet: false, tags: [], body: null })
				});
				if (res.ok) {
					step = 'done';
					setTimeout(() => onsubmitted(), 1600);
				} else {
					const data = await res.json().catch(() => ({}));
					error = (data as any).message ?? 'Something went wrong';
				}
			} finally {
				submitting = false;
			}
		} else {
			step = 'how-was-it';
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		{#if step === 'done'}
			<div class="done-state">
				<p class="done-text">Thank you — this helps build trust in the community.</p>
			</div>

		{:else if step === 'met'}
			<p class="question">Did you meet with <strong>@{otherUsername}</strong>?</p>
			{#if error}
				<p class="error-msg">{error}</p>
			{/if}
			<div class="yn-row">
				<button class="yn-btn yes" onclick={() => answerMet(true)} disabled={submitting}>
					Yes, we met
				</button>
				<button class="yn-btn no" onclick={() => answerMet(false)} disabled={submitting}>
					No, it didn't happen
				</button>
			</div>

		{:else}
			<p class="question">How was it? <span class="opt">(optional)</span></p>
			<div class="tags">
				{#each TAGS as tag}
					<button
						type="button"
						class="tag"
						class:selected={selectedTags.has(tag)}
						onclick={() => toggleTag(tag)}
					>{tag}</button>
				{/each}
			</div>
			<textarea
				class="note-input"
				placeholder="Add a note... (private)"
				value={note}
				oninput={(e) => note = (e.target as HTMLTextAreaElement).value}
				rows={3}
			></textarea>
			{#if error}
				<p class="error-msg">{error}</p>
			{/if}
			<div class="actions">
				<button class="skip-btn" onclick={submitFeedback} disabled={submitting}>
					{selectedTags.size === 0 && !note.trim() ? 'Skip' : (submitting ? 'Saving...' : 'Save')}
				</button>
				<button
					class="submit-btn"
					onclick={submitFeedback}
					disabled={submitting || selectedTags.size === 0}
				>
					{submitting ? 'Saving...' : 'Submit feedback'}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal {
		background: var(--bg-canvas, #f5f3f0);
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		border-radius: 10px;
		padding: 2rem;
		width: 100%;
		max-width: 440px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
	}

	.question {
		margin: 0 0 1.5rem;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.1rem;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.4;
	}

	.opt {
		font-size: 0.85rem;
		color: var(--text-muted, #888);
		font-family: inherit;
	}

	.yn-row {
		display: flex;
		gap: 0.75rem;
	}

	.yn-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
		border: 1px solid var(--border-link);
	}

	.yn-btn:disabled { opacity: 0.4; cursor: default; }

	.yn-btn.yes {
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border-color: var(--text-primary, #1a1a1a);
	}

	.yn-btn.yes:not(:disabled):hover { opacity: 0.8; }

	.yn-btn.no {
		background: none;
		color: var(--text-muted, #888);
	}

	.yn-btn.no:not(:disabled):hover { color: var(--text-primary, #1a1a1a); }

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}

	.tag {
		padding: 0.35rem 0.75rem;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 16px;
		background: none;
		font-size: 0.82rem;
		font-family: inherit;
		color: var(--text-secondary, #444);
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.tag:hover {
		border-color: var(--text-primary, #1a1a1a);
		color: var(--text-primary, #1a1a1a);
	}

	.tag.selected {
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border-color: var(--text-primary, #1a1a1a);
	}

	.note-input {
		width: 100%;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		border-radius: 6px;
		font-size: 0.85rem;
		font-family: inherit;
		background: var(--bg-canvas, #f5f3f0);
		color: var(--text-primary, #1a1a1a);
		resize: vertical;
		box-sizing: border-box;
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.note-input:focus { outline: none; border-color: var(--text-muted, #888); }
	.note-input::placeholder { color: var(--text-muted, #aaa); }

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.skip-btn {
		padding: 0.5rem 1rem;
		background: none;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		color: var(--text-muted, #888);
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.skip-btn:not(:disabled):hover {
		color: var(--text-primary, #1a1a1a);
		border-color: var(--text-primary, #1a1a1a);
	}

	.skip-btn:disabled { opacity: 0.4; cursor: default; }

	.submit-btn {
		padding: 0.5rem 1.1rem;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.submit-btn:disabled { opacity: 0.4; cursor: default; }
	.submit-btn:not(:disabled):hover { opacity: 0.8; }

	.error-msg {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		color: #c0392b;
	}

	.done-state {
		text-align: center;
		padding: 1rem 0;
	}

	.done-text {
		margin: 0;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		color: var(--text-muted, #888);
		line-height: 1.5;
	}
</style>
