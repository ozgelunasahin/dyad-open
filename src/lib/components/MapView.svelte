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
	}

	let { prompts, onSelectPin, onMapClick, initialCenter, initialZoom, onMoveEnd, scrollWheelZoom = true, zoomControl = false, zoomControlPosition = 'topleft', slotFilter }: Props = $props();

	let mapContainer: HTMLElement | undefined = $state();
	let map: LeafletMap | undefined;
	let markerLayer: LayerGroup | undefined;

	// ── Configuration ────────────────────────────────────────────────────────
	const BERLIN_CENTER: [number, number] = [52.52, 13.405];
	const DEFAULT_ZOOM = 12;

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
				? `<img src="${esc(imgSrc)}" alt="" class="marker-img" />`
				: `<div class="marker-placeholder">${esc((pin.prompt.title ?? '?')[0])}</div>`;

			const icon = L.divIcon({
				html,
				className: 'marker-pin',
				iconSize: [44, 44],
				iconAnchor: [22, 22]
			});

			const marker = L.marker(pin.position, { icon });
			marker.on('click', () => {
				const clickedPos = pin.position;
				const nearby = pins
					.filter(p => berlinDistance(p.position[0], p.position[1], clickedPos[0], clickedPos[1]) < FUZZ_MAX_METERS)
					.sort((a, b) => {
						const distA = (a.position[0] - clickedPos[0]) ** 2 + (a.position[1] - clickedPos[1]) ** 2;
						const distB = (b.position[0] - clickedPos[0]) ** 2 + (b.position[1] - clickedPos[1]) ** 2;
						return distA - distB;
					});
				// Dedup by prompt ID. The directly-clicked pin is at distance 0, so the
				// distance sort places it first — it always survives dedup. The first
				// occurrence (closest) for each prompt wins, so the clicked pin's slots
				// are the ones the BottomSheet card renders.
				const seen = new Set<string>();
				const items = nearby
					.filter(p => { if (seen.has(p.prompt.id)) return false; seen.add(p.prompt.id); return true; })
					.map(p => ({ prompt: p.prompt, slots: p.slots }));
				onSelectPin(items, `${items.length} nearby`);
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
			zoom: initialZoom ?? DEFAULT_ZOOM,
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

		// Close bottom sheet when clicking the map (not a marker)
		map.on('click', () => {
			onMapClick?.();
		});

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

<div class="map-container" bind:this={mapContainer}></div>

<style>
	.map-container {
		width: 100%;
		height: 100%;
	}

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
