<script lang="ts">
	import type { LocationRef } from '$lib/domain/types';

	interface Props {
		value: LocationRef | null;
		onChange: (location: LocationRef | null) => void;
		placeholder?: string;
	}

	let { value, onChange, placeholder = 'Search location...' }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional initial-value capture for search input
	let query = $state(value?.name ?? '');
	let results = $state<Array<{ place_id: string; name: string; address: string; lat: number; lng: number }>>([]);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	async function handleInput(e: Event) {
		const q = (e.target as HTMLInputElement).value;
		query = q;

		if (searchTimer) clearTimeout(searchTimer);

		if (q.length < 2) {
			results = [];
			return;
		}

		searchTimer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/locations/search?q=${encodeURIComponent(q)}&region=berlin`);
				if (res.ok) {
					results = await res.json();
				}
			} catch { /* ignore */ }
		}, 250);
	}

	function selectResult(result: typeof results[0]) {
		onChange(result);
		query = result.name;
		results = [];
	}

	function acceptFreeText() {
		if (!query.trim()) return;
		// If already a confirmed location with same name, keep it
		if (value?.name === query.trim()) return;
		// Accept typed text as a manual location (no coordinates); use name as address
		onChange({ place_id: 'manual', name: query.trim(), address: query.trim(), lat: 0, lng: 0 });
		results = [];
	}
</script>

<div class="location-search">
	<input
		type="text"
		{placeholder}
		value={query}
		oninput={handleInput}
		onblur={acceptFreeText}
		onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); acceptFreeText(); } }}
		role="combobox"
		aria-controls="location-results"
		aria-expanded={results.length > 0}
	/>
	{#if value && !results.length}
		<span class="location-badge">{value.name}</span>
	{/if}
	{#if results.length > 0}
		<div class="location-dropdown" id="location-results" role="listbox">
			{#each results as result}
				<button type="button" class="location-option" role="option" aria-selected="false" onmousedown={() => selectResult(result)}>
					<span class="loc-name">{result.name}</span>
					<span class="loc-addr">{result.address}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.location-search { position: relative; flex: 1; min-width: 180px; }

	.location-search input {
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		width: 100%;
		box-sizing: border-box;
	}

	.location-badge {
		font-size: var(--text-xs);
		color: var(--text-muted);
		display: block;
		margin-top: 2px;
	}

	.location-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-top: none;
		border-radius: 0 0 var(--radius-input) var(--radius-input);
		max-height: 200px;
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
		border-bottom: 1px solid var(--border-link);
		cursor: pointer;
		font-size: var(--text-sm);
	}

	.location-option:hover { background: var(--bg-control); }
	.loc-name { color: var(--text-primary); display: block; }
	.loc-addr { color: var(--text-muted); font-size: var(--text-xs); display: block; }

	@media (max-width: 430px) {
		.location-search { min-width: 100%; }
	}
</style>
