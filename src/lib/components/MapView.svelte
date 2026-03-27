<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PromptSummary } from '$lib/domain/types';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';

	interface Props {
		prompts: PromptSummary[];
		onSelectPin: (prompts: PromptSummary[], area: string) => void;
		initialCenter?: [number, number] | null;
		initialZoom?: number | null;
		onMoveEnd?: (center: [number, number], zoom: number) => void;
	}

	let { prompts, onSelectPin, initialCenter, initialZoom, onMoveEnd }: Props = $props();

	let mapContainer: HTMLElement | undefined = $state();
	let map: LeafletMap | undefined;
	let markerLayer: LayerGroup | undefined;

	// ── Configuration ────────────────────────────────────────────────────────
	const BERLIN_CENTER: [number, number] = [52.52, 13.405];
	const DEFAULT_ZOOM = 12;
	const FUZZ_MIN_METERS = 150;
	const FUZZ_MAX_METERS = 400;

	// ── Deterministic fuzz from slot ID ──────────────────────────────────────
	function hashToFloat(str: string, seed: number): number {
		let hash = seed;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
		}
		return (Math.abs(hash) % 10000) / 10000;
	}

	function fuzzCentroid(id: string, lat: number, lng: number): [number, number] {
		const angle = hashToFloat(id, 1) * 2 * Math.PI;
		const distFraction = hashToFloat(id, 2);
		const distMeters = FUZZ_MIN_METERS + distFraction * (FUZZ_MAX_METERS - FUZZ_MIN_METERS);
		const dLat = (distMeters / 111320) * Math.cos(angle);
		const dLng = (distMeters / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
		return [lat + dLat, lng + dLng];
	}

	// ── Build pin data ───────────────────────────────────────────────────────
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

	// ── HTML escaping for divIcon and popup content ──────────────────────────
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	function formatSlotDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	// ── Build popup preview HTML ─────────────────────────────────────────────
	function buildPreviewHtml(pin: { prompt: PromptSummary; area: string }): string {
		const p = pin.prompt;
		const imgHtml = p.cover_image_url
			? `<img src="${esc(p.cover_image_url)}" alt="" class="preview-img" loading="lazy" />`
			: `<div class="preview-img-placeholder">${esc((p.title ?? '?')[0])}</div>`;

		const slotDate = p.soonest_slot ? formatSlotDate(p.soonest_slot) : '';
		const snippet = p.body_snippet ? `<p class="preview-snippet">${esc(p.body_snippet)}</p>` : '';

		return `
			<a href="/prompts/${esc(p.id)}" class="preview-card">
				${imgHtml}
				<div class="preview-body">
					<h4 class="preview-title">${esc(p.title ?? 'Untitled')}</h4>
					${snippet}
					<div class="preview-meta">${esc(pin.area)}${slotDate ? ' · ' + esc(slotDate) : ''}</div>
				</div>
			</a>
		`;
	}

	function rebuildMarkers(L: typeof import('leaflet')) {
		if (!markerLayer) return;
		markerLayer.clearLayers();

		const pins = buildPins(prompts);

		for (const pin of pins) {
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
				const nearby = pins.filter(p => p.area === pin.area).map(p => p.prompt);
				if (nearby.length <= 1) {
					// Single conversation — fly to pin and show preview popup
					map?.flyTo(pin.position, Math.max(map.getZoom(), 14), { duration: 0.5 });
					marker.bindPopup(buildPreviewHtml(pin), {
						className: 'preview-popup',
						closeButton: false,
						maxWidth: 320,
						minWidth: 260,
						offset: [0, -28] as any,
						autoPan: true,
					}).openPopup();
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

		// Center on user location if available (only if no initial position)
		if (!initialCenter && 'geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					map?.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: false });
				},
				() => { /* permission denied — stay on Berlin center */ }
			);
		}
	});

	// Only rebuild markers when prompts data changes
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
		border: 2px solid var(--bg-canvas, #f5f3f0);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	:global(.marker-placeholder) {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 500;
		border: 2px solid var(--bg-canvas, #f5f3f0);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	/* Preview popup — strip Leaflet defaults */
	:global(.preview-popup .leaflet-popup-content-wrapper) {
		background: var(--bg-canvas, #f5f3f0);
		border-radius: var(--radius-card, 12px);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
		padding: 0;
	}
	:global(.preview-popup .leaflet-popup-content) {
		margin: 0;
		width: auto !important;
	}
	:global(.preview-popup .leaflet-popup-tip) {
		background: var(--bg-canvas, #f5f3f0);
	}

	:global(.preview-card) {
		display: flex;
		gap: 12px;
		padding: 12px;
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}
	:global(.preview-card:hover) { opacity: 0.8; }

	:global(.preview-img) {
		width: 64px;
		height: 64px;
		border-radius: 8px;
		object-fit: cover;
		flex-shrink: 0;
	}
	:global(.preview-img-placeholder) {
		width: 64px;
		height: 64px;
		border-radius: 8px;
		background: var(--bg-control, rgba(0,0,0,0.05));
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		color: var(--text-muted, #999);
		flex-shrink: 0;
	}

	:global(.preview-body) {
		flex: 1;
		min-width: 0;
	}
	:global(.preview-title) {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 500;
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	:global(.preview-snippet) {
		margin: 0 0 4px;
		font-size: 12px;
		color: var(--text-muted, #666);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	:global(.preview-meta) {
		font-family: var(--font-mono, monospace);
		font-size: 10px;
		color: var(--text-muted, #999);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
</style>
