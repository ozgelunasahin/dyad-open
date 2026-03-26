<script lang="ts">
	import type { LocationRef } from '$lib/domain/types';

	interface Props {
		value: LocationRef | null;
		onChange: (location: LocationRef | null) => void;
		placeholder?: string;
	}

	let { value, onChange, placeholder = 'Search location...' }: Props = $props();

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
</script>

<div class="location-search">
	<input
		type="text"
		{placeholder}
		value={query}
		oninput={handleInput}
		role="combobox"
		aria-expanded={results.length > 0}
	/>
	{#if value && !results.length}
		<span class="location-badge">{value.name}</span>
	{/if}
	{#if results.length > 0}
		<div class="location-dropdown">
			{#each results as result}
				<button type="button" class="location-option" onmousedown={() => selectResult(result)}>
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
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		padding: 8px 10px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 4px;
		background: transparent;
		color: var(--text-primary);
		width: 100%;
		box-sizing: border-box;
	}

	.location-badge {
		font-size: 11px;
		color: var(--text-muted, #666);
		display: block;
		margin-top: 2px;
	}

	.location-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-canvas, #f5f3f0);
		border: 1px solid var(--border-link);
		border-top: none;
		border-radius: 0 0 4px 4px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
	}

	.location-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 8px 10px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.06));
		cursor: pointer;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
	}

	.location-option:hover { background: var(--bg-control, rgba(0, 0, 0, 0.03)); }
	.loc-name { color: var(--text-primary); display: block; }
	.loc-addr { color: var(--text-muted, #999); font-size: 11px; display: block; }

	@media (max-width: 430px) {
		.location-search { min-width: 100%; }
	}
</style>
