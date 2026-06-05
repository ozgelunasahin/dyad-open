<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import type { LocationRef } from '$lib/domain/types';

	interface Props {
		value: LocationRef | null;
		onChange: (location: LocationRef | null) => void;
		placeholder?: string;
		/** Region key for search bounds (see the region registry in location.ts). */
		region?: string;
	}

	let { value, onChange, placeholder = 'Search location...', region = 'berlin' }: Props = $props();

	type Result = {
		place_id: string;
		name: string;
		address: string;
		lat: number;
		lng: number;
	};

	// svelte-ignore state_referenced_locally — intentional initial-value capture for search input
	let query = $state(value?.name ?? '');
	let results = $state<Result[]>([]);
	let loading = $state(false);
	let dropdownOpen = $state(false);
	let highlightedIndex = $state(-1);
	let inputElement: HTMLInputElement | undefined = $state();

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let abortController: AbortController | undefined;
	let blurCloseTimer: ReturnType<typeof setTimeout> | undefined;
	// Set in onDestroy. The deferred blur-close timer can fire after destroy
	// during DOM detach in some browsers; the guard keeps writes off dead
	// reactive state.
	let destroyed = false;

	// Manual option appears as the last item in the dropdown when the query is
	// non-empty. Lets the member explicitly say "use this text as the place name
	// even though Nominatim doesn't know it." Replaces the silent on-blur commit
	// that previously fired with lat/lng = 0,0 and broke the public map.
	const manualOption = $derived.by(() => {
		const trimmed = query.trim();
		if (!trimmed) return null;
		// Don't offer a manual option that duplicates a returned result.
		if (results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) return null;
		return trimmed;
	});

	// Total navigable rows (results + optional manual + optional empty hint).
	// Used to bound highlightedIndex.
	const navigableCount = $derived(results.length + (manualOption ? 1 : 0));

	function optionId(index: number): string {
		return `loc-opt-${index}`;
	}

	function clearAbort() {
		if (abortController) {
			abortController.abort();
			abortController = undefined;
		}
	}

	async function runSearch(q: string) {
		clearAbort();
		const controller = new AbortController();
		abortController = controller;
		loading = true;
		try {
			const res = await fetch(
				`/api/locations/search?q=${encodeURIComponent(q)}&region=${encodeURIComponent(region)}`,
				{
				signal: controller.signal
			});
			if (controller.signal.aborted) return;
			if (res.ok) {
				results = (await res.json()) as Result[];
			} else {
				results = [];
			}
		} catch (err) {
			// AbortError from a superseded request is expected — silently swallow.
			if (err instanceof DOMException && err.name === 'AbortError') return;
			results = [];
		} finally {
			// Defensive guard: clear loading whenever this controller is no longer
			// the active one (it has been superseded or cleared) AND when the
			// signal is unaborted. The race is the abort-mid-body-read narrow path
			// where both runs would skip clearing loading.
			if (!controller.signal.aborted || abortController !== controller) {
				loading = false;
			}
			if (abortController === controller) abortController = undefined;
		}
	}

	function handleInput(e: Event) {
		const q = (e.target as HTMLInputElement).value;
		query = q;
		dropdownOpen = true;
		highlightedIndex = -1;

		if (searchTimer) clearTimeout(searchTimer);

		if (q.trim().length < 2) {
			results = [];
			loading = false;
			clearAbort();
			return;
		}

		searchTimer = setTimeout(() => runSearch(q), 250);
	}

	function selectResult(result: Result) {
		onChange(result);
		query = result.name;
		closeDropdown();
	}

	function selectManual(text: string) {
		// Explicit user choice: commit the typed text as a manual location with
		// no coordinates. The map view should treat lat/lng = 0,0 as "no map
		// pin" rather than rendering a pin in the Atlantic — that handling
		// belongs in the map consumer, not here.
		onChange({ place_id: 'manual', name: text, address: text, lat: 0, lng: 0 });
		query = text;
		closeDropdown();
	}

	function clearValue() {
		query = '';
		results = [];
		loading = false;
		highlightedIndex = -1;
		clearAbort();
		onChange(null);
		inputElement?.focus();
	}

	function closeDropdown() {
		dropdownOpen = false;
		highlightedIndex = -1;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!dropdownOpen) {
				dropdownOpen = true;
				if (query.trim().length >= 2 && results.length === 0 && !loading) {
					// Re-run search if the dropdown was closed.
					runSearch(query.trim());
				}
			}
			if (navigableCount === 0) return;
			highlightedIndex = (highlightedIndex + 1) % navigableCount;
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!dropdownOpen || navigableCount === 0) return;
			highlightedIndex = highlightedIndex <= 0 ? navigableCount - 1 : highlightedIndex - 1;
			return;
		}
		if (e.key === 'Enter') {
			if (!dropdownOpen) return;
			e.preventDefault();
			if (highlightedIndex < 0) {
				// No selection: prefer the first real result, then manual option.
				if (results.length > 0) {
					selectResult(results[0]);
				} else if (manualOption) {
					selectManual(manualOption);
				}
				return;
			}
			if (highlightedIndex < results.length) {
				selectResult(results[highlightedIndex]);
			} else if (manualOption) {
				selectManual(manualOption);
			}
			return;
		}
		if (e.key === 'Escape') {
			if (dropdownOpen) {
				e.preventDefault();
				// Stop the keydown bubbling to the document so PublishSheet's
				// global Esc-to-close handler doesn't dismiss the whole modal
				// when the user just wanted to close the dropdown.
				e.stopPropagation();
				closeDropdown();
			}
			return;
		}
	}

	function handleFocus() {
		if (results.length > 0 || loading || manualOption) {
			dropdownOpen = true;
		}
	}

	function handleBlur() {
		// Delay the close so a click on a dropdown option's onmousedown can
		// fire its handler before the dropdown unmounts. NO commit on blur —
		// the previous shape silently committed query as a manual location with
		// lat/lng = 0,0 which broke the public map view.
		if (blurCloseTimer) clearTimeout(blurCloseTimer);
		blurCloseTimer = setTimeout(() => {
			if (destroyed) return;
			closeDropdown();
			// Re-sync the visible query with the committed value. If the user
			// typed something but didn't commit, the input now reflects what's
			// actually saved rather than the stale typed text.
			query = value?.name ?? '';
		}, 150);
	}

	function cancelBlurClose() {
		if (blurCloseTimer) {
			clearTimeout(blurCloseTimer);
			blurCloseTimer = undefined;
		}
	}

	onDestroy(() => {
		destroyed = true;
		if (searchTimer) clearTimeout(searchTimer);
		if (blurCloseTimer) clearTimeout(blurCloseTimer);
		clearAbort();
	});

	// Empty-state and any-content predicates. Folded together — the empty-state
	// row is one of the four content sources (loading, results, manual, empty),
	// so the any-content predicate enumerates all four directly.
	const showEmptyState = $derived(
		dropdownOpen && !loading && query.trim().length >= 2 && results.length === 0 && !manualOption
	);

	const showAnyDropdownContent = $derived(
		dropdownOpen && (loading || results.length > 0 || !!manualOption || showEmptyState)
	);

	// Auto-scroll the highlighted option into view when keyboard navigation
	// moves it. Capture the index before tick() so a fast follow-up keypress
	// doesn't make this microtask scroll to the wrong (now-stale) row.
	$effect(() => {
		if (highlightedIndex < 0) return;
		const idx = highlightedIndex;
		void tick().then(() => {
			if (idx !== highlightedIndex) return;
			const el = document.getElementById(optionId(idx));
			el?.scrollIntoView({ block: 'nearest' });
		});
	});
</script>

<div class="location-search">
	<input
		bind:this={inputElement}
		type="text"
		{placeholder}
		value={query}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={handleFocus}
		onblur={handleBlur}
		role="combobox"
		aria-controls="location-results"
		aria-expanded={showAnyDropdownContent}
		aria-autocomplete="list"
		aria-activedescendant={highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined}
		aria-label={placeholder}
		autocomplete="off"
	/>

	{#if query.length > 0}
		<button
			type="button"
			class="clear-button"
			onclick={clearValue}
			onmousedown={cancelBlurClose}
			aria-label="Clear location">&times;</button>
	{/if}

	{#if showAnyDropdownContent}
		<div
			class="location-dropdown"
			id="location-results"
			role="listbox"
			onmousedown={cancelBlurClose}
		>
			{#if loading}
				<div class="dropdown-state" aria-live="polite">Searching…</div>
			{/if}

			{#each results as result, i (result.place_id)}
				<button
					type="button"
					tabindex="-1"
					id={optionId(i)}
					class="location-option"
					class:highlighted={highlightedIndex === i}
					role="option"
					aria-selected={highlightedIndex === i}
					onmousedown={(e) => {
						e.preventDefault();
						selectResult(result);
					}}
					onmouseenter={() => (highlightedIndex = i)}
				>
					<span class="loc-name">{result.name}</span>
					<span class="loc-addr">{result.address}</span>
				</button>
			{/each}

			{#if manualOption}
				{@const manualIdx = results.length}
				<button
					type="button"
					tabindex="-1"
					id={optionId(manualIdx)}
					class="location-option location-option--manual"
					class:highlighted={highlightedIndex === manualIdx}
					role="option"
					aria-selected={highlightedIndex === manualIdx}
					onmousedown={(e) => {
						e.preventDefault();
						selectManual(manualOption);
					}}
					onmouseenter={() => (highlightedIndex = manualIdx)}
				>
					<span class="loc-name">Use "{manualOption}" as place name</span>
					<span class="loc-addr">No map pin will be shown</span>
				</button>
			{/if}

			{#if showEmptyState}
				<div class="dropdown-state" aria-live="polite">
					No matches for "{query.trim()}"
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.location-search { position: relative; flex: 1; min-width: 180px; }

	.location-search input {
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		width: 100%;
		box-sizing: border-box;
	}

	.location-search input:focus { outline: none; border-color: var(--text-muted); }

	.clear-button {
		position: absolute;
		top: 50%;
		right: var(--space-2);
		transform: translateY(-50%);
		background: none;
		border: none;
		font-size: var(--text-md);
		line-height: 1;
		color: var(--text-muted);
		cursor: pointer;
		padding: var(--space-1) var(--space-2);
	}

	.clear-button:hover { color: var(--text-primary); }

	.location-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 0 0 var(--radius-input) var(--radius-input);
		border-top: none;
		max-height: 240px;
		overflow-y: auto;
		z-index: 10;
	}

	.location-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-subtle);
		cursor: pointer;
		font-size: var(--text-sm);
		font-family: inherit;
	}

	.location-option:last-child { border-bottom: none; }

	.location-option:hover,
	.location-option.highlighted {
		background: var(--bg-control);
	}

	.location-option:focus { outline: none; background: var(--bg-control); }

	.location-option--manual .loc-name {
		color: var(--text-muted);
		font-style: italic;
	}

	.loc-name { color: var(--text-primary); display: block; }
	.loc-addr { color: var(--text-muted); font-size: var(--text-xs); display: block; margin-top: var(--space-1); }

	.dropdown-state {
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		color: var(--text-muted);
		font-style: italic;
	}

	@media (max-width: 430px) {
		.location-search { min-width: 100%; }
	}
</style>
