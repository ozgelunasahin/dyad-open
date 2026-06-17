<script lang="ts">
	interface NominatimResult {
		display_name: string;
		address: {
			city?: string;
			town?: string;
			village?: string;
			state?: string;
			country?: string;
		};
	}

	let {
		value = $bindable(''),
		placeholder = 'Based in',
		disabled = false
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
	} = $props();

	let results = $state<NominatimResult[]>([]);
	let open = $state(false);
	let activeIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	async function fetchResults(q: string) {
		if (q.trim().length < 2) {
			results = [];
			open = false;
			return;
		}
		try {
			const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&featuretype=city`;
			const res = await fetch(url, {
				headers: { 'Accept-Language': 'en' }
			});
			if (!res.ok) return;
			const data: NominatimResult[] = await res.json();
			results = data;
			open = results.length > 0;
			activeIndex = -1;
		} catch {
			results = [];
			open = false;
		}
	}

	function formatResult(r: NominatimResult): string {
		const a = r.address;
		const city = a.city || a.town || a.village || '';
		const country = a.country || '';
		if (city && country) return `${city}, ${country}`;
		if (city) return city;
		return r.display_name.split(',').slice(0, 2).join(',').trim();
	}

	function handleInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		value = val;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchResults(val), 300);
	}

	function selectResult(r: NominatimResult) {
		value = formatResult(r);
		open = false;
		results = [];
		activeIndex = -1;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (e.key === 'Enter') {
			if (activeIndex >= 0 && activeIndex < results.length) {
				e.preventDefault();
				selectResult(results[activeIndex]);
			}
		} else if (e.key === 'Escape') {
			// Stop the Escape here so a parent (e.g. AuthDialog's window listener)
			// doesn't also close — one Escape dismisses the dropdown, not the modal.
			e.stopPropagation();
			open = false;
			activeIndex = -1;
		}
	}

	function handleBlur() {
		setTimeout(() => {
			open = false;
			activeIndex = -1;
		}, 200);
	}

	function handleFocus() {
		if (results.length > 0) open = true;
	}
</script>

<div class="city-search">
	<input
		type="text"
		value={value}
		{placeholder}
		{disabled}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={handleBlur}
		onfocus={handleFocus}
	/>
	{#if open && results.length > 0}
		<div class="city-dropdown">
			{#each results as result, i}
				<button
					type="button"
					class="city-option"
					class:active={i === activeIndex}
					onmousedown={(e) => {
						e.preventDefault();
						selectResult(result);
					}}
				>
					{formatResult(result)}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.city-search {
		position: relative;
		flex: 1;
	}

	.city-search input[type='text'] {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		transition: border-color 0.15s;
		box-sizing: border-box;
	}

	.city-search input[type='text']::placeholder {
		color: var(--text-muted);
	}

	.city-search input[type='text']:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.city-search input[type='text']:disabled {
		opacity: var(--opacity-disabled);
	}

	.city-dropdown {
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
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.city-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link);
		font-size: var(--text-sm);
		color: var(--text-primary);
		cursor: pointer;
	}

	.city-option:last-child {
		border-bottom: none;
	}

	.city-option:hover,
	.city-option.active {
		background: var(--bg-control);
	}
</style>
