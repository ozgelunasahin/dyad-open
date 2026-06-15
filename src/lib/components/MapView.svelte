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
			const disc = imgSrc
				? `<img src="${esc(imgSrc)}" alt="" class="poi-img" />`
				: `<div class="poi-ph">${esc((pin.prompt.title ?? '?')[0])}</div>`;
			const title = esc(pin.prompt.title ?? 'Untitled');
			const sub = pin.area ? esc(pin.area) : '';

			// Tactile floating marker: a cover disc lifted off the map (ground
			// shadow + ring + accent badge) with a label beside it.
			const html = `
				<div class="poi-ground"></div>
				<div class="poi-disc">${disc}<span class="poi-badge"></span></div>
				<div class="poi-label">
					<span class="poi-title">${title}</span>
					${sub ? `<span class="poi-sub">${sub}</span>` : ''}
				</div>`;

			const icon = L.divIcon({
				html,
				className: 'poi-icon',
				iconSize: [46, 46],
				iconAnchor: [23, 23]
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

		// Center on user location if available (no animation — instant jump)
		if (!initialCenter && 'geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					map?.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: false });
				},
				() => { /* permission denied or error — stay on Berlin center */ }
			);
		}
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

	/* ── Tactile floating POI marker ── */
	:global(.poi-icon) {
		background: none !important;
		border: none !important;
		overflow: visible !important;
	}

	/* Ground shadow — sells the lift off the map */
	:global(.poi-ground) {
		position: absolute;
		left: 50%;
		bottom: -7px;
		width: 30px;
		height: 9px;
		transform: translateX(-50%);
		background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.12) 45%, transparent 72%);
		filter: blur(1px);
		pointer-events: none;
		transition: transform 0.18s ease, opacity 0.18s ease;
	}

	/* The floating disc */
	:global(.poi-disc) {
		position: absolute;
		inset: 0;
		width: 46px;
		height: 46px;
		border-radius: 50%;
		background: #fff;
		padding: 3px;
		box-sizing: border-box;
		box-shadow:
			0 8px 16px rgba(0, 0, 0, 0.26),
			0 2px 5px rgba(0, 0, 0, 0.22),
			inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
		transition: transform 0.18s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.18s ease;
		will-change: transform;
	}

	:global(.poi-img) {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		display: block;
	}

	:global(.poi-ph) {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: #2a2a32;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 500;
	}

	/* Accent badge dot */
	:global(.poi-badge) {
		position: absolute;
		top: -1px;
		right: -1px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #f5a623;
		border: 2.5px solid #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	/* Label beside the disc */
	:global(.poi-label) {
		position: absolute;
		left: 54px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 1px;
		max-width: 150px;
		pointer-events: none;
	}

	:global(.poi-title) {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 13px;
		font-weight: 600;
		line-height: 1.2;
		color: #1a1a1a;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9), 0 0 4px rgba(255, 255, 255, 0.7);
	}

	:global(.poi-sub) {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 11px;
		font-style: italic;
		line-height: 1.2;
		color: #6b6b73;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
	}

	/* Hover: lift higher, shadow spreads */
	:global(.poi-icon:hover) { z-index: 1000 !important; }
	:global(.poi-icon:hover .poi-disc) {
		transform: translateY(-4px) scale(1.07);
		box-shadow:
			0 16px 28px rgba(0, 0, 0, 0.3),
			0 4px 8px rgba(0, 0, 0, 0.24),
			inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
	}
	:global(.poi-icon:hover .poi-ground) {
		transform: translateX(-50%) scale(1.15);
		opacity: 0.85;
	}

	:global(.leaflet-control-attribution) {
		font-size: 9px !important;
		background: rgba(255, 255, 255, 0.6) !important;
		padding: 2px 5px !important;
	}
</style>
