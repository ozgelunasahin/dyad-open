<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PromptSummary } from '$lib/domain/types';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';

	interface Props {
		prompts: PromptSummary[];
		onSelectPin: (prompts: PromptSummary[], area: string) => void;
		onNavigate: (promptId: string) => void;
		initialCenter?: [number, number] | null;
		initialZoom?: number | null;
		onMoveEnd?: (center: [number, number], zoom: number) => void;
	}

	let { prompts, onSelectPin, onNavigate, initialCenter, initialZoom, onMoveEnd }: Props = $props();

	let mapContainer: HTMLElement | undefined = $state();
	let map: LeafletMap | undefined;
	let markerLayer: LayerGroup | undefined;

	// ── Configuration ────────────────────────────────────────────────────────
	const BERLIN_CENTER: [number, number] = [52.52, 13.405];
	const DEFAULT_ZOOM = 12;
	const FUZZ_MIN_METERS = 150;
	const FUZZ_MAX_METERS = 400;

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
				const nearby = pins.filter(p => p.area === pin.area).map(p => p.prompt);
				if (nearby.length <= 1) {
					// Single conversation — navigate directly
					onNavigate(pin.prompt.id);
				} else {
					// Multiple conversations in this area — show list
					onSelectPin(nearby, pin.area);
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
			zoom: initialZoom ?? DEFAULT_ZOOM,
			zoomControl: false,
			attributionControl: true
		});

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 18
		}).addTo(map);

		// Report map position changes (debounced — moveend fires many times during inertial scroll)
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

		// Center on user location if available (only if no initial position was provided)
		if (!initialCenter && 'geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					map?.setView([pos.coords.latitude, pos.coords.longitude], 13);
				},
				() => { /* permission denied or error — stay on Berlin center */ }
			);
		}
	});

	// Only rebuild markers when prompts data changes — not on every pan/zoom
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
		min-height: 400px;
	}

	:global(.marker-pin) {
		background: none !important;
		border: none !important;
	}

	:global(.marker-img) {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid #f5f3f0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	:global(.marker-placeholder) {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: #1a1a1a;
		color: #f5f3f0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 18px;
		font-weight: 500;
		border: 2px solid #f5f3f0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
</style>
