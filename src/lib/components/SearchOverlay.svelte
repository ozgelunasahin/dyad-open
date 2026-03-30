<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { searchItems, type SearchableItem } from '$lib/utils/search.js';
	import { copy } from '$lib/copy';

	interface Props {
		prompts: SearchableItem[];
		onClose: () => void;
		onSelect: (promptId: string) => void;
	}

	let { prompts, onClose, onSelect }: Props = $props();

	let query = $state('');
	let liveQuery = $derived(query.trim());
	let results = $derived(searchItems(prompts, liveQuery));

	function handleSuggestion(s: string) {
		query = s;
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
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
		<!-- svelte-ignore a11y_autofocus -->
		<input
			bind:value={query}
			autofocus
			class="search-input"
			placeholder={copy.discover.searchPlaceholder}
			autocomplete="off"
			spellcheck="false"
		/>
	</div>

	{#if liveQuery.length < 2}
		<div class="suggestions" transition:fly={{ y: 10, duration: 180 }}>
			{#each copy.discover.searchSuggestions as s}
				<button class="suggestion-chip" onclick={() => handleSuggestion(s)}>{s}</button>
			{/each}
		</div>
	{:else if results.length === 0}
		<p class="no-results" transition:fade={{ duration: 120 }}>{copy.discover.noResults}</p>
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
						{#if prompt.body_text}
							<p class="result-snippet">{prompt.body_text.slice(0, 120)}</p>
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
		font-size: var(--text-2xl);
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
		color: var(--text-muted);
		opacity: 0.4;
	}

	.suggestions {
		padding: 0 var(--space-6) var(--space-10);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		justify-content: center;
	}

	.suggestion-chip {
		background: var(--bg-control);
		border: none;
		border-radius: var(--radius-pill);
		padding: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
		color: var(--text-secondary);
		cursor: pointer;
		transition: background 0.15s;
	}

	.suggestion-chip:hover {
		background: var(--bg-control-hover);
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
		background: var(--bg-control);
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
		gap: var(--space-1);
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
		line-height: var(--leading-normal);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
