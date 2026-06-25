<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { searchItems, hasFullWord, type SearchableItem } from '$lib/utils/search.js';
	import ConversationCard from '$lib/components/ConversationCard.svelte';
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

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

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

	{#if !hasFullWord(liveQuery)}
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
				<ConversationCard
					title={prompt.title ?? 'Untitled'}
					coverUrl={prompt.cover_image_url}
					snippet={prompt.body_text}
					metaLeft={prompt.soonest_slot ? formatDate(prompt.soonest_slot) : null}
					onclick={() => onSelect(prompt.id)}
				/>
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
		padding: 0 var(--space-5) var(--space-6);
		max-height: 50vh;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}
</style>
