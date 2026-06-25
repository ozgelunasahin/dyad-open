<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';
	import { buildPins, berlinDistance, FUZZ_MAX_METERS, type SlotFilter } from './MapView.pins';

	interface Props {
		prompts: PromptSummary[];
		onSelectPin: (items: Array<{ prompt: PromptSummary; slots: TimeSlot[] }>, area: string) => void;
		onMapClick?: () => void;
		initialCenter?: [number, number] | null;
		initialZoom?: number | null;
		onMoveEnd?: (center: [number, number], zoom: number) => void;
		scrollWheelZoom?: boolean;
		zoomControl?: boolean;
		zoomControlPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
		/** Optional per-slot filter — when present, only slots passing this predicate
		 *  produce a pin. Used by the discover page so date/area filters narrow pin
		 *  emission rather than just the conversation list. */
		slotFilter?: SlotFilter;
		/** When true, MapView renders an Airbnb-style card anchored above the
		 *  clicked pin (following the map on pan/zoom), with arrow paging through
		 *  co-located conversations. The discover page uses this instead of the
		 *  BottomSheet. Landing keeps `onSelectPin` + its own card. */
		anchoredPopup?: boolean;
		/** When true (and no saved zoom), the map arrives at neighbourhood zoom
		 *  rather than the whole-city view, then recentres on the viewer if
		 *  geolocation succeeds and they're in Berlin. Discover sets this. */
		locateOnLoad?: boolean;
	}

	let { prompts, onSelectPin, onMapClick, initialCenter, initialZoom, onMoveEnd, scrollWheelZoom = true, zoomControl = false, zoomControlPosition = 'topleft', slotFilter, anchoredPopup = false, locateOnLoad = false }: Props = $props();

	// ── Anchored pin popup (discover) ─────────────────────────────────────────
	let popupItems = $state<Array<{ prompt: PromptSummary; slots: TimeSlot[] }>>([]);
	let popupIndex = $state(0);
	let anchorXY = $state<{ x: number; y: number } | null>(null);
	let anchorLatLng: [number, number] | null = null;
	const popupCurrent = $derived(popupItems[popupIndex] ?? null);

	// Card element + computed placement. The card is clamped inside the map and
	// flips below the pin when there isn't room above, so it never overflows the
	// (often small) mobile viewport. `pointer` keeps the little triangle aimed at
	// the pin even when the card is shifted to stay on-screen.
	let popupEl = $state<HTMLElement | undefined>();
	let placement = $state<{ left: number; top: number; below: boolean; pointer: number } | null>(null);

	function updateAnchorXY() {
		if (!map || !leafletModule || !anchorLatLng) return;
		const p = map.latLngToContainerPoint(leafletModule.latLng(anchorLatLng[0], anchorLatLng[1]));
		anchorXY = { x: p.x, y: p.y };
	}

	function computePlacement() {
		if (!popupEl || !anchorXY || !mapContainer) {
			placement = null;
			return;
		}
		const cw = mapContainer.clientWidth;
		const w = popupEl.offsetWidth;
		const h = popupEl.offsetHeight;
		const pad = 8;
		const gap = 26; // clearance from the 44px marker
		// Horizontal: centre on the pin, then clamp so the card stays fully inside.
		const left = Math.max(pad + w / 2, Math.min(anchorXY.x, cw - pad - w / 2));
		// Vertical: prefer above the pin; flip below when the top would clip.
		const below = anchorXY.y - gap - h < pad;
		const top = below ? anchorXY.y + gap : anchorXY.y - gap;
		// Pointer offset from the card's centre so it still aims at the pin.
		const pointer = Math.max(-w / 2 + 16, Math.min(anchorXY.x - left, w / 2 - 16));
		placement = { left, top, below, pointer };
	}

	// Recompute whenever the anchor moves (pan/zoom) or the shown card changes
	// (paging can change the card's height). Runs after DOM update, so the
	// element dimensions are current.
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		[anchorXY, popupIndex, popupItems.length];
		computePlacement();
	});

	function closePopup() {
		popupItems = [];
		popupIndex = 0;
		anchorLatLng = null;
		anchorXY = null;
		placement = null;
	}

	function nextPopup() {
		if (popupItems.length === 0) return;
		popupIndex = (popupIndex + 1) % popupItems.length;
	}
	function prevPopup() {
		if (popupItems.length === 0) return;
		popupIndex = (popupIndex - 1 + popupItems.length) % popupItems.length;
	}

	function popupDate(item: { prompt: PromptSummary; slots: TimeSlot[] }): string | null {
		const iso = item.slots?.[0]?.start_time ?? item.prompt.soonest_slot ?? null;
		return iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null;
	}
	function popupArea(item: { prompt: PromptSummary; slots: TimeSlot[] }): string | null {
		return item.slots?.[0]?.general_area ?? null;
	}

	let mapContainer: HTMLElement | undefined = $state();
	let map: LeafletMap | undefined;
	let markerLayer: LayerGroup | undefined;

	// ── Configuration ────────────────────────────────────────────────────────
	const BERLIN_CENTER: [number, number] = [52.52, 13.405];
	const DEFAULT_ZOOM = 12;
	// Neighbourhood-level arrival zoom for the discover map (locateOnLoad), used
	// immediately so the viewer never lands on the whole city — even before /
	// without geolocation.
	const NEIGHBORHOOD_ZOOM = 14;
	// Zoom applied when we successfully locate the viewer in Berlin.
	const LOCATED_ZOOM = 15;
	// Berlin bounding box — only snap to the viewer if they're actually here, so
	// someone opening from another city still sees the Berlin feed, not an empty
	// map centred on themselves.
	const BERLIN_BOUNDS = { south: 52.33, north: 52.68, west: 13.08, east: 13.77 };

	function withinBerlin(lat: number, lng: number): boolean {
		return (
			lat >= BERLIN_BOUNDS.south &&
			lat <= BERLIN_BOUNDS.north &&
			lng >= BERLIN_BOUNDS.west &&
			lng <= BERLIN_BOUNDS.east
		);
	}

	function rebuildMarkers(L: typeof import('leaflet')) {
		if (!markerLayer) return;
		markerLayer.clearLayers();

		const pins = buildPins(prompts, slotFilter);

		for (const pin of pins) {
			// Cover image marker (or placeholder)
			// Escape HTML attributes to prevent XSS from user-controlled URLs/titles
			const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			const imgSrc = pin.prompt.cover_image_url;
			const html = imgSrc
				? `<img src="${esc(imgSrc)}" alt="" class="marker-img" loading="lazy" />`
				: `<div class="marker-placeholder">${esc((pin.prompt.title ?? '?')[0])}</div>`;

			const icon = L.divIcon({
				html,
				className: 'marker-pin',
				iconSize: [44, 44],
				iconAnchor: [22, 22]
			});

			const marker = L.marker(pin.position, { icon });
			marker.on('click', () => {
				// Gather conversations co-located with the clicked pin (within the
				// fuzz radius), clicked one first, deduped by prompt. The anchored
				// popup pages through them with an arrow; the BottomSheet path takes
				// the same list. No vertical stacking either way.
				const clickedPos = pin.position;
				const seen = new Set<string>();
				const items = pins
					.filter((p) => berlinDistance(p.position[0], p.position[1], clickedPos[0], clickedPos[1]) < FUZZ_MAX_METERS)
					.sort((a, b) => {
						const dA = (a.position[0] - clickedPos[0]) ** 2 + (a.position[1] - clickedPos[1]) ** 2;
						const dB = (b.position[0] - clickedPos[0]) ** 2 + (b.position[1] - clickedPos[1]) ** 2;
						return dA - dB;
					})
					.filter((p) => { if (seen.has(p.prompt.id)) return false; seen.add(p.prompt.id); return true; })
					.map((p) => ({ prompt: p.prompt, slots: p.slots }));

				if (anchoredPopup) {
					popupItems = items;
					popupIndex = 0;
					anchorLatLng = clickedPos;
					updateAnchorXY();
				} else {
					onSelectPin(items, pin.prompt.title ?? '');
				}
			});
			marker.addTo(markerLayer);
		}
	}

	let leafletModule: typeof import('leaflet') | undefined;

	onMount(async () => {
		if (!mapContainer) return;

		const L = await import('leaflet');
		leafletModule = L;

		(L.Icon.Default as any).prototype.options.imagePath = '/leaflet/';

		map = L.map(mapContainer, {
			center: initialCenter ?? BERLIN_CENTER,
			zoom: initialZoom ?? (locateOnLoad ? NEIGHBORHOOD_ZOOM : DEFAULT_ZOOM),
			zoomControl: false,
			attributionControl: true,
			scrollWheelZoom
		});

		if (zoomControl) {
			L.control.zoom({ position: zoomControlPosition }).addTo(map);
		}

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19,
			detectRetina: true
		}).addTo(map);

		// Close the card when clicking the map (not a marker)
		map.on('click', () => {
			closePopup();
			onMapClick?.();
		});

		// Keep the anchored popup glued to its pin as the map pans/zooms.
		map.on('move', updateAnchorXY);
		map.on('zoom', updateAnchorXY);
		map.on('resize', updateAnchorXY);

		// On a fresh open (no saved zoom), recentre on the viewer so they land on
		// their own neighbourhood. The map already arrived at NEIGHBORHOOD_ZOOM, so
		// even if this is denied / slow / outside Berlin they still see a
		// neighbourhood, never the whole city. Location is used client-side only —
		// never sent to the server.
		if (locateOnLoad && initialZoom == null && typeof navigator !== 'undefined' && navigator.geolocation) {
			map.once('locationfound', (e) => {
				if (!map) return;
				const { lat, lng } = e.latlng;
				if (withinBerlin(lat, lng)) {
					map.setView([lat, lng], LOCATED_ZOOM, { animate: true });
				}
			});
			// locationerror is a no-op — we simply stay on the neighbourhood view.
			map.locate({ setView: false, enableHighAccuracy: false, maximumAge: 300000 });
		}

		// Report map position changes (debounced)
		let moveEndTimer: ReturnType<typeof setTimeout>;
		map.on('moveend', () => {
			clearTimeout(moveEndTimer);
			moveEndTimer = setTimeout(() => {
				if (!map) return;
				const c = map.getCenter();
				onMoveEnd?.([c.lat, c.lng], map.getZoom());
			}, 300);
		});

		markerLayer = L.layerGroup().addTo(map);
		rebuildMarkers(L);
	});

	let prevPrompts: PromptSummary[] | undefined;
	let prevSlotFilter: SlotFilter | undefined;
	$effect(() => {
		const currentPrompts = prompts;
		const currentFilter = slotFilter;
		if (
			leafletModule &&
			markerLayer &&
			(currentPrompts !== prevPrompts || currentFilter !== prevSlotFilter)
		) {
			prevPrompts = currentPrompts;
			prevSlotFilter = currentFilter;
			rebuildMarkers(leafletModule);
			// A filter/data change can drop the conversation the popup is showing —
			// close it so it never lingers over a pin that's no longer there.
			closePopup();
		}
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
		markerLayer = undefined;
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="/leaflet/leaflet.css" />
</svelte:head>

<div class="map-wrap">
	<div class="map-container" bind:this={mapContainer}></div>

	{#if anchoredPopup && popupCurrent && anchorXY}
		<!-- Airbnb-style card anchored to the clicked pin. Follows the map on
		     pan/zoom and clamps inside the viewport so it never overflows. -->
		<div
			class="pin-popup"
			class:below={placement?.below}
			bind:this={popupEl}
			style="left: {placement?.left ?? anchorXY.x}px; top: {placement?.top ?? anchorXY.y}px; --pointer: {placement?.pointer ?? 0}px;"
		>
			<a class="pin-popup-card" href={`/conversations/${popupCurrent.prompt.id}`}>
				<div class="pin-popup-cover">
					{#if popupCurrent.prompt.cover_image_url}
						<img src={popupCurrent.prompt.cover_image_url} alt="" loading="lazy" />
					{:else}
						<div class="pin-popup-cover-placeholder">
							{(popupCurrent.prompt.title ?? '?')[0]}
						</div>
					{/if}
					{#if popupItems.length > 1}
						<button
							type="button"
							class="pin-popup-next"
							aria-label="Next conversation"
							onclick={(e) => { e.preventDefault(); e.stopPropagation(); nextPopup(); }}
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
						</button>
						<button
							type="button"
							class="pin-popup-prev"
							aria-label="Previous conversation"
							onclick={(e) => { e.preventDefault(); e.stopPropagation(); prevPopup(); }}
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
						</button>
						<div class="pin-popup-dots">
							{#each popupItems as _, i}
								<span class="pin-popup-dot" class:active={i === popupIndex}></span>
							{/each}
						</div>
					{/if}
				</div>
				<div class="pin-popup-body">
					<p class="pin-popup-title">{popupCurrent.prompt.title ?? 'Untitled'}</p>
					<div class="pin-popup-meta">
						{#if popupArea(popupCurrent)}<span>{popupArea(popupCurrent)}</span>{/if}
						{#if popupDate(popupCurrent)}<span>{popupDate(popupCurrent)}</span>{/if}
					</div>
				</div>
			</a>
			<button
				type="button"
				class="pin-popup-close"
				aria-label="Close"
				onclick={(e) => { e.preventDefault(); e.stopPropagation(); closePopup(); }}
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			</button>
		</div>
	{/if}
</div>

<style>
	.map-wrap {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.map-container {
		width: 100%;
		height: 100%;
	}

	/* ── Anchored pin popup (Airbnb-style) ──────────────────────────────────── */
	.pin-popup {
		position: absolute;
		z-index: 500;
		/* `left`/`top` come from clamped placement (JS). Default sits the card
		   above the pin; `.below` flips it under for pins near the top edge.
		   Width is capped to the viewport so it always fits on mobile. */
		transform: translate(-50%, -100%);
		width: min(230px, calc(100vw - 32px));
		pointer-events: none;
	}
	.pin-popup.below {
		transform: translate(-50%, 0);
	}

	.pin-popup-card {
		display: block;
		background: var(--bg-canvas);
		border-radius: var(--radius-card);
		overflow: hidden;
		box-shadow: 0 6px 28px rgba(0, 0, 0, 0.22);
		text-decoration: none;
		color: inherit;
		pointer-events: auto;
	}

	/* little pointer triangle aimed at the pin; --pointer tracks it horizontally
	   when the card is clamped, and it flips to the top edge when card is below */
	.pin-popup::after {
		content: '';
		position: absolute;
		left: calc(50% + var(--pointer, 0px));
		bottom: -7px;
		transform: translateX(-50%);
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 8px solid var(--bg-canvas);
		filter: drop-shadow(0 3px 2px rgba(0, 0, 0, 0.12));
	}
	.pin-popup.below::after {
		bottom: auto;
		top: -7px;
		border-top: none;
		border-bottom: 8px solid var(--bg-canvas);
		filter: drop-shadow(0 -3px 2px rgba(0, 0, 0, 0.12));
	}

	.pin-popup-cover {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		background: var(--bg-control);
	}
	.pin-popup-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.pin-popup-cover-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 500;
		color: var(--text-muted);
	}

	.pin-popup-next,
	.pin-popup-prev {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.92);
		color: #111;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		pointer-events: auto;
	}
	.pin-popup-next { right: 8px; }
	.pin-popup-prev { left: 8px; }
	.pin-popup-next:hover,
	.pin-popup-prev:hover { background: #fff; }

	.pin-popup-dots {
		position: absolute;
		bottom: 8px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 4px;
	}
	.pin-popup-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.6);
	}
	.pin-popup-dot.active { background: #fff; }

	.pin-popup-body {
		padding: var(--space-3);
	}
	.pin-popup-title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-1);
		line-height: var(--leading-tight);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.pin-popup-meta {
		display: flex;
		gap: var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.pin-popup-close {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.92);
		color: #111;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		pointer-events: auto;
	}
	.pin-popup-close:hover { background: #fff; }

	:global(.marker-pin) {
		background: none !important;
		border: none !important;
	}

	:global(.marker-img) {
		width: 44px !important;
		height: 44px !important;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--bg-canvas);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		box-sizing: border-box;
		display: block;
		aspect-ratio: 1;
	}

	:global(.leaflet-control-attribution) {
		font-size: 9px !important;
		background: rgba(255, 255, 255, 0.6) !important;
		padding: 2px 5px !important;
	}

	:global(.marker-placeholder) {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--text-primary);
		color: var(--bg-canvas);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-xl);
		font-weight: 500;
		border: 2px solid var(--bg-canvas);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		box-sizing: border-box;
	}
</style>
