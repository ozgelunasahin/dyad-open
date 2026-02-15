<script lang="ts">
	interface PhotonFeature {
		properties: {
			name?: string;
			street?: string;
			housenumber?: string;
			postcode?: string;
			locality?: string;
			district?: string;
			city?: string;
		};
	}

	interface PlaceResult {
		exactLocation: string;
		postcode: string;
	}

	let {
		value = '',
		placeholder = 'Search for a place...',
		onSelect
	}: {
		value?: string;
		placeholder?: string;
		onSelect: (place: PlaceResult) => void;
	} = $props();

	// Fallback neighbourhood lookup for when Photon lacks locality/district
	const POSTCODE_NEIGHBOURHOOD: Record<string, string> = {
		'10115': 'Mitte',
		'10178': 'Mitte',
		'10243': 'Friedrichshain',
		'10245': 'Friedrichshain',
		'10247': 'Friedrichshain',
		'10249': 'Prenzlauer Berg',
		'10405': 'Prenzlauer Berg',
		'10435': 'Prenzlauer Berg',
		'10437': 'Prenzlauer Berg',
		'10551': 'Moabit',
		'10623': 'Charlottenburg',
		'10785': 'Tiergarten',
		'10961': 'Kreuzberg',
		'10965': 'Kreuzberg',
		'10967': 'Kreuzberg',
		'10969': 'Kreuzberg',
		'10997': 'Kreuzberg',
		'10999': 'Kreuzberg',
		'12043': 'Neukoelln',
		'12045': 'Neukoelln',
		'12047': 'Neukoelln',
		'12049': 'Neukoelln',
		'12053': 'Neukoelln',
		'12099': 'Tempelhof',
		'13347': 'Wedding',
		'13353': 'Wedding'
	};

	let query = $state(value);
	let results = $state<PhotonFeature[]>([]);
	let open = $state(false);
	let activeIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let inputEl: HTMLInputElement | undefined;

	// Sync external value changes into query
	$effect(() => {
		query = value;
	});

	async function fetchResults(q: string) {
		if (q.trim().length < 2) {
			results = [];
			open = false;
			return;
		}
		try {
			const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en&lat=52.52&lon=13.405&bbox=13.08835,52.33826,13.76116,52.67551`;
			const res = await fetch(url);
			if (!res.ok) return;
			const data = await res.json();
			results = data.features ?? [];
			open = results.length > 0;
			activeIndex = -1;
		} catch {
			results = [];
			open = false;
		}
	}

	function handleInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		query = val;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchResults(val), 300);
	}

	function formatDisplayName(f: PhotonFeature): { name: string; address: string } {
		const p = f.properties;
		const name = p.name || '';
		const parts: string[] = [];
		if (p.street) {
			parts.push(p.street + (p.housenumber ? ' ' + p.housenumber : ''));
		}
		if (p.postcode) parts.push(p.postcode);
		return { name, address: parts.join(', ') };
	}

	function buildResult(f: PhotonFeature): PlaceResult {
		const p = f.properties;
		// exactLocation: name + street + housenumber
		const locationParts: string[] = [];
		if (p.name) locationParts.push(p.name);
		if (p.street) {
			locationParts.push(p.street + (p.housenumber ? ' ' + p.housenumber : ''));
		}
		const exactLocation = locationParts.join(', ');

		// postcode: postcode + neighbourhood
		const neighbourhood = p.locality ?? p.district ?? (p.postcode ? POSTCODE_NEIGHBOURHOOD[p.postcode] : undefined) ?? p.city ?? '';
		const postcode = p.postcode
			? `${p.postcode}${neighbourhood ? ' ' + neighbourhood : ''}`
			: neighbourhood;

		return { exactLocation, postcode };
	}

	function selectResult(f: PhotonFeature) {
		const result = buildResult(f);
		query = result.exactLocation;
		open = false;
		results = [];
		activeIndex = -1;
		onSelect(result);
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
			e.preventDefault();
			if (activeIndex >= 0 && activeIndex < results.length) {
				selectResult(results[activeIndex]);
			}
		} else if (e.key === 'Escape') {
			open = false;
			activeIndex = -1;
		}
	}

	function handleBlur() {
		// Delay to allow click on dropdown item
		setTimeout(() => {
			open = false;
			activeIndex = -1;
		}, 200);
	}

	function handleFocus() {
		if (results.length > 0) {
			open = true;
		}
	}
</script>

<div class="place-search">
	<input
		bind:this={inputEl}
		type="text"
		value={query}
		{placeholder}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={handleBlur}
		onfocus={handleFocus}
	/>
	{#if open && results.length > 0}
		<div class="location-dropdown">
			{#each results as feature, i}
				{@const display = formatDisplayName(feature)}
				<button
					type="button"
					class="location-option"
					class:active={i === activeIndex}
					onmousedown={(e) => {
						e.preventDefault();
						selectResult(feature);
					}}
				>
					<span class="option-name">{display.name}</span>
					{#if display.address}
						<span class="option-address">{display.address}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.place-search {
		position: relative;
	}

	.place-search input[type='text'] {
		width: 100%;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.place-search input[type='text']:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	.place-search input[type='text']::placeholder {
		color: var(--text-muted);
		font-style: italic;
	}

	.location-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-top: none;
		border-radius: 0 0 4px 4px;
		max-height: 220px;
		overflow-y: auto;
		z-index: 10;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.location-option {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link);
		font-family: inherit;
		color: var(--text-primary);
		cursor: pointer;
	}

	.location-option:last-child {
		border-bottom: none;
	}

	.location-option:hover,
	.location-option.active {
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
	}

	.option-name {
		font-size: 0.88rem;
		font-weight: 500;
	}

	.option-address {
		font-size: 0.78rem;
		color: var(--text-muted);
	}
</style>
