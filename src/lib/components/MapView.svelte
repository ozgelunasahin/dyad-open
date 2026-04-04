<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PromptSummary } from '$lib/domain/types';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';

	interface Props {
		prompts: PromptSummary[];
		onSelectPin: (prompts: PromptSummary[], area: string) => void;
		onMapClick?: () => void;
		initialCenter?: [number, number] | null;
		initialZoom?: number | null;
		onMoveEnd?: (center: [number, number], zoom: number) => void;
		scrollWheelZoom?: boolean;
		zoomControl?: boolean;
		zoomControlPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
	}

	let { prompts, onSelectPin, onMapClick, initialCenter, initialZoom, onMoveEnd, scrollWheelZoom = true, zoomControl = false, zoomControlPosition = 'topleft' }: Props = $props();

	let mapContainer: HTMLElement | undefined = $state();
	let map: LeafletMap | undefined;
	let markerLayer: LayerGroup | undefined;

	// ── Configuration ────────────────────────────────────────────────────────
	const BERLIN_CENTER: [number, number] = [52.52, 13.405];
	const DEFAULT_ZOOM = 12;
	const FUZZ_MIN_METERS = 150;
	const FUZZ_MAX_METERS = 400;
	const DEG_TO_METERS = 111_320;
	const LON_SCALE = Math.cos(52.52 * Math.PI / 180); // ~0.609 for Berlin

	/** Approximate distance in meters between two lat/lng points in Berlin. Zero trig per call. */
	function berlinDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const dy = (lat2 - lat1) * DEG_TO_METERS;
		const dx = (lon2 - lon1) * DEG_TO_METERS * LON_SCALE;
		return Math.sqrt(dx * dx + dy * dy);
	}

	// ── Deterministic fuzz from slot ID ──────────────────────────────────────
	// Simple hash: converts a string to a number between 0 and 1
	function hashToFloat(str: string, seed: number): number {
		let hash = seed;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
		}
		return (Math.abs(hash) % 10000) / 10000;
	}

	function fuzzCentroid(id: string, lat: number, lng: number): [number, number] {
		const angle = hashToFloat(id, 1) * 2 * Math.PI;
		const distFraction = hashToFloat(id, 2); // 0-1
		const distMeters = FUZZ_MIN_METERS + distFraction * (FUZZ_MAX_METERS - FUZZ_MIN_METERS);

		// Convert meters to degrees (latitude correction for longitude)
		const dLat = (distMeters / 111320) * Math.cos(angle);
		const dLng = (distMeters / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);

		return [lat + dLat, lng + dLng];
	}

	// ── Build pin data: one entry per prompt (using first slot's centroid) ───
	function buildPins(items: PromptSummary[]): Array<{
		position: [number, number];
		prompt: PromptSummary;
		area: string;
	}> {
		const pins: Array<{ position: [number, number]; prompt: PromptSummary; area: string }> = [];

		for (const prompt of items) {
			const slot = prompt.available_slots[0];
			if (!slot || slot.general_area_lat == null || slot.general_area_lng == null) continue;

			const position = fuzzCentroid(slot.id, slot.general_area_lat, slot.general_area_lng);
			pins.push({ position, prompt, area: slot.general_area });
		}

		return pins;
	}

	function rebuildMarkers(L: typeof import('leaflet')) {
		if (!markerLayer) return;
		markerLayer.clearLayers();

		const pins = buildPins(prompts);

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
					})
					.map(p => p.prompt);
				// Deduplicate by prompt ID (a prompt with multiple slots may have multiple pins)
				const seen = new Set<string>();
				const unique = nearby.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
				onSelectPin(unique.length > 0 ? unique : [pin.prompt], `${unique.length} nearby`);
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
	$effect(() => {
		const currentPrompts = prompts;
		if (leafletModule && markerLayer && currentPrompts !== prevPrompts) {
			prevPrompts = currentPrompts;
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
