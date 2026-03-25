<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Conversation {
		id: string;
		name: string;
		slug: string;
		username: string;
		snippet: string;
		coverImageUrl: string | null;
		days: string[];
		timeRange: string;
		locations: string[];
	}

	interface WeekDate {
		label: string;
		dayShort: string;
		dayNum: number;
	}

	let {
		conversations,
		weekDates = [],
		selectedDays,
		onToggleDay,
		onClose
	}: {
		conversations: Conversation[];
		weekDates?: WeekDate[];
		selectedDays: Set<string>;
		onToggleDay: (label: string) => void;
		onClose: () => void;
	} = $props();

	let mapEl: HTMLDivElement;
	let mapReady = $state(false);
	let mapRef: import('leaflet').Map | null = null;
	let LRef: typeof import('leaflet') | null = null;
	let activeMarkers: import('leaflet').CircleMarker[] = [];
	let refreshGen = 0;

	let selectedConvo = $state<Conversation | null>(null);
	let sheetVisible = $state(false);

	function seededOffset(seed: string): { lat: number; lng: number } {
		let h = 0;
		for (let i = 0; i < seed.length; i++) {
			h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
		}
		const a = (h & 0xffff) / 0xffff;
		const b = ((h >> 16) & 0xffff) / 0xffff;
		return { lat: (a - 0.5) * 0.008, lng: (b - 0.5) * 0.012 };
	}

	async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
		const key = `geo_${postcode}`;
		try {
			const cached = sessionStorage.getItem(key);
			if (cached) return JSON.parse(cached);
		} catch { /* ignore */ }
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(postcode + ' Berlin Germany')}&format=json&limit=1`,
				{ headers: { 'Accept-Language': 'en' } }
			);
			const data = await res.json();
			if (data[0]) {
				const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
				try { sessionStorage.setItem(key, JSON.stringify(coords)); } catch { /* ignore */ }
				return coords;
			}
		} catch { /* ignore */ }
		return null;
	}

	async function refreshMarkers(convos: Conversation[]) {
		if (!mapRef || !LRef) return;
		const gen = ++refreshGen;

		// Clear existing markers
		for (const m of activeMarkers) m.remove();
		activeMarkers = [];

		const seen = new Map<string, { lat: number; lng: number } | null>();

		for (const convo of convos) {
			if (gen !== refreshGen) return; // superseded by a newer call

			const postcode = convo.locations[0];
			if (!postcode) continue;

			if (!seen.has(postcode)) {
				// Check session cache first (no rate-limit needed for cached)
				const cacheKey = `geo_${postcode}`;
				let coords: { lat: number; lng: number } | null = null;
				try {
					const cached = sessionStorage.getItem(cacheKey);
					if (cached) {
						coords = JSON.parse(cached);
					} else {
						coords = await geocodePostcode(postcode);
						await new Promise(r => setTimeout(r, 1100)); // rate-limit only uncached
					}
				} catch { /* ignore */ }
				seen.set(postcode, coords);
			}

			const base = seen.get(postcode);
			if (!base) continue;

			const offset = seededOffset(convo.id);
			const lat = base.lat + offset.lat;
			const lng = base.lng + offset.lng;

			const L = LRef;
			const marker = L.circleMarker([lat, lng], {
				radius: 9,
				fillColor: '#1a1a1a',
				fillOpacity: 0.9,
				color: '#f5f4f0',
				weight: 2
			}).addTo(mapRef!);

			marker.on('click', (e) => {
				L.DomEvent.stopPropagation(e);
				selectedConvo = convo;
				sheetVisible = true;
			});

			activeMarkers.push(marker);
		}
	}

	// Re-place markers whenever conversations changes (filter change)
	$effect(() => {
		if (!mapReady) return;
		const convos = conversations; // reactive dependency
		refreshMarkers(convos);
	});

	function closeSheet() {
		sheetVisible = false;
		setTimeout(() => { selectedConvo = null; }, 260);
	}

	onMount(async () => {
		document.body.style.overflow = 'hidden';

		const L = await import('leaflet');
		LRef = L;
		// @ts-ignore
		delete L.Icon.Default.prototype._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl: '/leaflet/marker-icon-2x.png',
			iconUrl: '/leaflet/marker-icon.png',
			shadowUrl: '/leaflet/marker-shadow.png'
		});

		mapRef = L.map(mapEl, { zoomControl: false, attributionControl: false }).setView([52.52, 13.405], 12);
		L.control.zoom({ position: 'topright' }).addTo(mapRef);
		L.control.attribution({ position: 'topright', prefix: false })
			.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
			.addTo(mapRef);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 18
		}).addTo(mapRef);

		mapRef.on('click', () => { if (sheetVisible) closeSheet(); });

		mapReady = true; // triggers $effect → refreshMarkers
	});

	onDestroy(() => {
		mapRef?.remove();
		document.body.style.overflow = '';
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="/leaflet/leaflet.css" />
</svelte:head>

<div class="map-overlay">
	<!-- Back button -->
	<button class="back-btn" onclick={onClose} aria-label="Back to list">
		<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
			<path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		List
	</button>

	<!-- Map canvas -->
	<div class="map" bind:this={mapEl}></div>

	<!-- Date filter chips at bottom -->
	{#if weekDates.length > 0}
		<div class="bottom-filters">
			<div class="date-chips">
				{#each weekDates as day}
					<button
						class="date-chip"
						class:selected={selectedDays.has(day.label)}
						onclick={() => onToggleDay(day.label)}
					>
						<span class="chip-day">{day.dayShort}</span>
						<span class="chip-num">{day.dayNum}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Bottom sheet -->
	{#if sheetVisible && selectedConvo}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sheet-backdrop" onclick={closeSheet}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bottom-sheet"
			transition:fly={{ y: 320, duration: 260, opacity: 1 }}
			onclick={() => { window.location.href = `/@${selectedConvo!.username}/${selectedConvo!.slug}`; }}
		>
			<div class="sheet-handle"></div>
			{#if selectedConvo.coverImageUrl}
				<img src={selectedConvo.coverImageUrl} alt="" class="sheet-img" />
			{/if}
			<div class="sheet-body">
				<p class="sheet-meta">
					{#if selectedConvo.locations[0]}<span>{selectedConvo.locations[0]}</span>{/if}
					{#if selectedConvo.days.length > 0}<span>{selectedConvo.days[0]}</span>{/if}
				</p>
				<h3 class="sheet-title">{selectedConvo.name}</h3>
				{#if selectedConvo.snippet}
					<p class="sheet-snippet">{selectedConvo.snippet.slice(0, 140)}…</p>
				{/if}
			</div>
			<button
				class="sheet-close"
				onclick={(e) => { e.stopPropagation(); closeSheet(); }}
				aria-label="Close"
			>×</button>
		</div>
	{/if}
</div>

<style>
	.map-overlay {
		position: fixed;
		inset: 0;
		z-index: 500;
		background: #e8e4dc;
	}

	.map {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.back-btn {
		position: absolute;
		top: 16px;
		left: 16px;
		z-index: 600;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px 8px 10px;
		background: var(--bg-canvas, #f5f4f0);
		border: none;
		border-radius: 20px;
		font-size: 0.85rem;
		font-family: inherit;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
		transition: opacity 0.15s;
	}

	.back-btn:hover { opacity: 0.8; }

	.bottom-filters {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 600;
		padding: 16px 16px 28px;
		background: linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%);
		pointer-events: none;
	}

	.date-chips {
		display: flex;
		gap: 8px;
		justify-content: center;
		pointer-events: auto;
	}

	.date-chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 6px 10px;
		background: rgba(245, 244, 240, 0.92);
		border: none;
		border-radius: 10px;
		cursor: pointer;
		font-family: inherit;
		color: var(--text-primary, #1a1a1a);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition: background 0.15s, color 0.15s;
	}

	.date-chip.selected {
		background: #1a1a1a;
		color: #f5f4f0;
	}

	.chip-day {
		font-size: 0.58rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.7;
	}

	.chip-num {
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1;
	}

	.date-chip.selected .chip-day { opacity: 0.8; }

	.sheet-backdrop {
		position: absolute;
		inset: 0;
		z-index: 700;
	}

	.bottom-sheet {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 800;
		background: var(--bg-canvas, #f5f4f0);
		border-radius: 16px 16px 0 0;
		overflow: hidden;
		box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
		max-height: 70vh;
		overflow-y: auto;
		cursor: pointer;
	}

	.sheet-handle {
		width: 36px;
		height: 4px;
		background: rgba(0, 0, 0, 0.18);
		border-radius: 2px;
		margin: 10px auto 0;
	}

	.sheet-img {
		width: 100%;
		height: 180px;
		object-fit: cover;
		display: block;
		margin-top: 12px;
	}

	.sheet-body {
		padding: 1rem 1.25rem 1.5rem;
	}

	.sheet-meta {
		display: flex;
		gap: 0.5rem;
		font-size: 0.72rem;
		color: var(--text-muted, #999);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-family: 'SF Mono', monospace;
		margin: 0 0 0.4rem;
	}

	.sheet-meta span + span::before {
		content: '·';
		margin-right: 0.5rem;
	}

	.sheet-title {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.3;
	}

	.sheet-snippet {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-secondary, #666);
		line-height: 1.55;
	}

	.sheet-close {
		position: absolute;
		top: 12px;
		right: 14px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.12);
		color: var(--text-primary, #1a1a1a);
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Minimal attribution — keep it legally present but unobtrusive */
	:global(.leaflet-control-attribution) {
		font-size: 9px !important;
		opacity: 0.6;
		background: transparent !important;
		box-shadow: none !important;
		padding: 1px 4px !important;
	}

	:global(.leaflet-control-attribution a) {
		color: inherit;
	}

	@media (max-width: 430px) {
		.back-btn {
			top: 12px;
			left: 12px;
		}

		.date-chips { gap: 6px; }
		.date-chip { padding: 5px 8px; }
		.sheet-img { height: 140px; }
	}
</style>
