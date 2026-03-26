<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PromptSummary, TimeSlot } from '$lib/domain/types';
	import type { Map as LeafletMap, LayerGroup, CircleMarker } from 'leaflet';

	interface Props {
		prompts: PromptSummary[];
		onSelectPin: (prompts: PromptSummary[], area: string) => void;
	}

	let { prompts, onSelectPin }: Props = $props();

	let mapContainer: HTMLElement | undefined = $state();
	let map: LeafletMap | undefined;
	let markerLayer: LayerGroup | undefined;

	// Berlin center
	const BERLIN_CENTER: [number, number] = [52.52, 13.405];
	const DEFAULT_ZOOM = 12;

	// Group prompts by neighbourhood
	function groupByNeighbourhood(items: PromptSummary[]): Map<string, { lat: number; lng: number; prompts: PromptSummary[] }> {
		const groups = new Map<string, { lat: number; lng: number; prompts: PromptSummary[] }>();

		for (const prompt of items) {
			for (const slot of prompt.available_slots) {
				if (!slot.general_area || slot.general_area_lat == null || slot.general_area_lng == null) continue;

				const existing = groups.get(slot.general_area);
				if (existing) {
					if (!existing.prompts.includes(prompt)) {
						existing.prompts.push(prompt);
					}
				} else {
					groups.set(slot.general_area, {
						lat: slot.general_area_lat,
						lng: slot.general_area_lng,
						prompts: [prompt]
					});
				}
			}
		}

		return groups;
	}

	function rebuildMarkers(L: typeof import('leaflet')) {
		if (!markerLayer) return;
		markerLayer.clearLayers();

		const groups = groupByNeighbourhood(prompts);

		for (const [area, data] of groups) {
			const marker = L.circleMarker([data.lat, data.lng], {
				radius: 9,
				fillColor: '#1a1a1a',
				fillOpacity: 0.9,
				color: '#f5f3f0',
				weight: 2
			});

			// Show count badge for multi-prompt pins
			if (data.prompts.length > 1) {
				marker.bindTooltip(String(data.prompts.length), {
					permanent: true,
					direction: 'center',
					className: 'pin-count'
				});
			}

			marker.on('click', () => onSelectPin(data.prompts, area));
			marker.addTo(markerLayer);
		}
	}

	let leafletModule: typeof import('leaflet') | undefined;

	onMount(async () => {
		if (!mapContainer) return;

		const L = await import('leaflet');
		leafletModule = L;

		// Override default icon paths to self-hosted
		(L.Icon.Default as any).prototype.options.imagePath = '/leaflet/';

		map = L.map(mapContainer, {
			center: BERLIN_CENTER,
			zoom: DEFAULT_ZOOM,
			zoomControl: true,
			attributionControl: true
		});

		// OSM tiles — OSMF is EU-based, acceptable for MVP
		// TODO: switch to self-hosted PMTiles or OpenFreeMap when available
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 18
		}).addTo(map);

		markerLayer = L.layerGroup().addTo(map);
		rebuildMarkers(L);
	});

	// Reactively rebuild markers when prompts change (filters applied)
	$effect(() => {
		if (leafletModule && markerLayer) {
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
		height: 500px;
		border-radius: var(--radius-card, 12px);
		overflow: hidden;
	}

	@media (max-width: 430px) {
		.map-container {
			height: 400px;
			border-radius: 0;
		}
	}

	:global(.pin-count) {
		background: none !important;
		border: none !important;
		box-shadow: none !important;
		color: #f5f3f0;
		font-size: 11px;
		font-weight: 600;
		font-family: 'SF Mono', monospace;
	}
</style>
