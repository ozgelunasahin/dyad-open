<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import type { PromptSummary } from '$lib/domain/types';

	interface Props {
		prompts: PromptSummary[];
		onClose: () => void;
		onSelect: (promptId: string) => void;
	}

	let { prompts, onClose, onSelect }: Props = $props();

	let query = $state('');
	let submitted = $state('');

	const SUGGESTIONS = [
		'strangers & connection',
		'philosophy of everyday life',
		'art and who makes it',
		'what we owe each other',
		'living in Berlin',
	];

	const STOP_WORDS = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'it', 'i', 'my', 'we', 'do', 'so', 'no', 'not', 'but', 'with', 'this', 'that', 'from', 'by', 'as', 'be', 'are', 'was', 'who', 'what', 'how', 'about']);

	function score(prompt: PromptSummary, q: string): number {
		const words = q.toLowerCase().split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
		if (!words.length) return 0;
		const title = (prompt.title ?? '').toLowerCase();
		const snippet = (prompt.body_snippet ?? '').toLowerCase();
		let s = 0;
		for (const w of words) {
			if (title.includes(w)) s += 3;
			if (snippet.includes(w)) s += 1;
		}
		return s;
	}

	let results = $derived.by(() => {
		const q = submitted.trim();
		if (!q) return [];
		return prompts
			.map(p => ({ prompt: p, score: score(p, q) }))
			.filter(x => x.score > 0)
			.sort((a, b) => b.score - a.score)
			.map(x => x.prompt);
	});

	function handleSuggestion(s: string) {
		query = s;
		submitted = s;
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'Enter') submitted = query;
	}

	// Lock body scroll
	let prevOverflow = '';
	onMount(() => {
		prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	});
	onDestroy(() => {
		document.body.style.overflow = prevOverflow;
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" transition:fade={{ duration: 180 }} onkeydown={handleKey}>
	<button class="close-btn" onclick={onClose} aria-label="Close search">&times;</button>

	<div class="search-area">
		<input
			bind:value={query}
			autofocus
			class="search-input"
			placeholder="Search"
			autocomplete="off"
			spellcheck="false"
		/>
	</div>

	{#if !submitted}
		<div class="suggestions" transition:fly={{ y: 10, duration: 180 }}>
			{#each SUGGESTIONS as s}
				<button class="suggestion-chip" onclick={() => handleSuggestion(s)}>{s}</button>
			{/each}
		</div>
	{:else if results.length === 0}
		<p class="no-results" transition:fade={{ duration: 120 }}>No conversations found.</p>
	{:else}
		<div class="results" transition:fly={{ y: 10, duration: 180 }}>
			{#each results as prompt}
				<button class="result-row" onclick={() => onSelect(prompt.id)}>
					<div class="result-thumb">
						{#if prompt.cover_image_url}
							<img src={prompt.cover_image_url} alt="" />
						{:else}
							<div class="thumb-placeholder"></div>
						{/if}
					</div>
					<div class="result-body">
						<p class="result-title">{prompt.title}</p>
						{#if prompt.body_snippet}
							<p class="result-snippet">{prompt.body_snippet}</p>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 900;
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.close-btn {
		position: absolute;
		top: var(--space-5);
		right: var(--space-5);
		width: 36px;
		height: 36px;
		border: none;
		background: transparent;
		font-size: 1.6rem;
		line-height: 1;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.search-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space-10);
		min-height: 0;
	}

	.search-input {
		width: 100%;
		background: transparent;
		border: none;
		outline: none;
		font-size: clamp(2rem, 10vw, 3.5rem);
		font-weight: 300;
		text-align: center;
		caret-color: var(--text-primary);
	}

	.search-input::placeholder {
		color: rgba(0, 0, 0, 0.15);
	}

	.suggestions {
		padding: 0 var(--space-6) var(--space-10);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		justify-content: center;
	}

	.suggestion-chip {
		background: rgba(0, 0, 0, 0.06);
		border: none;
		border-radius: var(--radius-pill);
		padding: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.15s;
	}

	.suggestion-chip:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.no-results {
		text-align: center;
		color: var(--text-muted);
		font-size: var(--text-md);
		padding-bottom: var(--space-10);
	}

	.results {
		overflow-y: auto;
		padding: 0 0 var(--space-6);
		max-height: 55vh;
	}

	.result-row {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-5);
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background 0.12s;
	}

	.result-row:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.result-thumb {
		width: 52px;
		height: 52px;
		flex-shrink: 0;
		border-radius: var(--radius-input);
		overflow: hidden;
	}

	.result-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumb-placeholder {
		width: 100%;
		height: 100%;
		background: var(--bg-control);
	}

	.result-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
		justify-content: center;
	}

	.result-title {
		margin: 0;
		font-size: var(--text-md);
		font-weight: 500;
		line-height: var(--leading-tight);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-snippet {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
