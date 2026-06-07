<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { PromptSummary } from '$lib/domain/types';
	import type { Map as LeafletMap, LayerGroup } from 'leaflet';

	interface Props {
		prompts: PromptSummary[];
		onSelectPin: (prompts: PromptSummary[], area: string) => void;
		onCardClick?: (prompt: PromptSummary) => void;
		onMapClick?: () => void;
		initialCenter?: [number, number] | null;
		initialZoom?: number | null;
		onMoveEnd?: (center: [number, number], zoom: number) => void;
		scrollWheelZoom?: boolean;
		zoomControl?: boolean;
		zoomControlPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
	}

	let { prompts, onSelectPin, onCardClick, onMapClick, initialCenter, initialZoom, onMoveEnd, scrollWheelZoom = true, zoomControl = false, zoomControlPosition = 'topleft' }: Props = $props();

	let mapContainer: HTMLElement | undefined = $state();
	let map: LeafletMap | undefined;
	let markerLayer: LayerGroup | undefined;

	// ── Hover / pin card state ────────────────────────────────────────────────
	const CARD_W = 220;
	const CARD_MARGIN = 10;

	let hoverPrompt = $state<PromptSummary | null>(null);
	let hoverPos = $state<{ x: number; y: number; caretX: number } | null>(null);
	let pinned = $state(false);
	let hideTimer: ReturnType<typeof setTimeout>;

	function computePos(rawX: number, y: number) {
		const containerW = mapContainer?.offsetWidth ?? 0;
		const cardLeft = Math.min(Math.max(rawX - CARD_W / 2, CARD_MARGIN), containerW - CARD_W - CARD_MARGIN);
		return { x: cardLeft, y, caretX: rawX - (cardLeft + CARD_W / 2) };
	}

	function showHover(prompt: PromptSummary, rawX: number, y: number) {
		if (pinned) return;
		clearTimeout(hideTimer);
		hoverPrompt = prompt;
		hoverPos = computePos(rawX, y);
	}

	function hideHover() {
		if (pinned) return;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => { hoverPrompt = null; hoverPos = null; }, 300);
	}

	function keepHover() {
		if (pinned) return;
		clearTimeout(hideTimer);
	}

	function togglePin() {
		pinned = !pinned;
		if (!pinned) { hoverPrompt = null; hoverPos = null; }
	}

	function dismissPin() {
		pinned = false;
		hoverPrompt = null;
		hoverPos = null;
	}

	function formatHoverDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	// ── Configuration ────────────────────────────────────────────────────────
	const BERLIN_CENTER: [number, number] = [52.52, 13.405];
	const DEFAULT_ZOOM = 12;
	const FUZZ_MIN_METERS = 150;
	const FUZZ_MAX_METERS = 400;
	const DEG_TO_METERS = 111_320;
	const LON_SCALE = Math.cos(52.52 * Math.PI / 180);

	function berlinDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const dy = (lat2 - lat1) * DEG_TO_METERS;
		const dx = (lon2 - lon1) * DEG_TO_METERS * LON_SCALE;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function hashToFloat(str: string, seed: number): number {
		let hash = seed;
		for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
		return (Math.abs(hash) % 10000) / 10000;
	}

	function fuzzCentroid(id: string, lat: number, lng: number): [number, number] {
		const angle = hashToFloat(id, 1) * 2 * Math.PI;
		const dist = FUZZ_MIN_METERS + hashToFloat(id, 2) * (FUZZ_MAX_METERS - FUZZ_MIN_METERS);
		const dLat = (dist / 111320) * Math.cos(angle);
		const dLng = (dist / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
		return [lat + dLat, lng + dLng];
	}

	function buildPins(items: PromptSummary[]) {
		const pins: Array<{ position: [number, number]; prompt: PromptSummary; area: string }> = [];
		for (const prompt of items) {
			const slot = prompt.available_slots[0];
			if (!slot || slot.general_area_lat == null || slot.general_area_lng == null) continue;
			pins.push({ position: fuzzCentroid(slot.id, slot.general_area_lat, slot.general_area_lng), prompt, area: slot.general_area });
		}
		return pins;
	}

	function rebuildMarkers(L: typeof import('leaflet')) {
		if (!markerLayer) return;
		markerLayer.clearLayers();

		const pins = buildPins(prompts);

		for (const pin of pins) {
			const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			const imgSrc = pin.prompt.cover_image_url;
			const html = imgSrc
				? `<img src="${esc(imgSrc)}" alt="" class="marker-img" />`
				: `<div class="marker-placeholder">${esc((pin.prompt.title ?? '?')[0])}</div>`;

			const icon = L.divIcon({ html, className: 'marker-pin', iconSize: [44, 44], iconAnchor: [22, 22] });
			const marker = L.marker(pin.position, { icon });

			// Click → pin card
			marker.on('click', (e: any) => {
				const cp = e.containerPoint;
				clearTimeout(hideTimer);
				hoverPrompt = pin.prompt;
				hoverPos = computePos(cp.x, cp.y);
				pinned = true;
			});

			// Hover → preview card
			marker.on('mouseover', (e: any) => {
				showHover(pin.prompt, e.containerPoint.x, e.containerPoint.y);
			});
			marker.on('mouseout', hideHover);

			marker.addTo(markerLayer!);
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
			scrollWheelZoom,
		});

		if (zoomControl) L.control.zoom({ position: zoomControlPosition }).addTo(map);

		L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 20,
			detectRetina: true,
		}).addTo(map);

		map.on('click', () => {
			onMapClick?.();
			dismissPin();
		});

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

<div class="map-wrapper">
	<div class="map-container" bind:this={mapContainer}></div>

	{#if hoverPrompt && hoverPos}
		<div
			class="hover-card"
			class:is-pinned={pinned}
			class:is-clickable={!!onCardClick}
			style="left: {hoverPos.x}px; top: {hoverPos.y}px; --caret-x: {hoverPos.caretX}px;"
			transition:fade={{ duration: 120 }}
			role="button"
			tabindex="0"
			onmouseenter={keepHover}
			onmouseleave={hideHover}
			onclick={() => onCardClick ? onCardClick(hoverPrompt!) : togglePin()}
			onkeydown={(e) => { if (e.key === 'Enter') onCardClick?.(hoverPrompt!); }}
		>
			{#if hoverPrompt.cover_image_url}
				<div class="hover-card-cover">
					<img src={hoverPrompt.cover_image_url} alt="" />
				</div>
			{/if}
			<div class="hover-card-body">
				<p class="hover-card-title">{hoverPrompt.title ?? 'Untitled'}</p>
				<p class="hover-card-meta">
					{#if hoverPrompt.soonest_slot}
						<span>{formatHoverDate(hoverPrompt.soonest_slot)}</span>
						<span class="hover-card-dot">·</span>
					{/if}
					<span>{hoverPrompt.available_slots[0]?.general_area ?? ''}</span>
				</p>
			</div>
			<div class="hover-card-caret"></div>
		</div>
	{/if}
</div>

<style>
	.map-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.map-container {
		width: 100%;
		height: 100%;
	}

	/* ── Hover card ─────────────────────────────────────────────────────────── */
	.hover-card {
		position: absolute;
		width: 220px;
		background: var(--bg-canvas, #fff);
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08);
		overflow: visible;
		pointer-events: auto;
		z-index: 1000;
		transform: translateY(calc(-100% - 22px));
		cursor: pointer;
	}

	.hover-card-pin {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.35);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 2;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.hover-card:hover .hover-card-pin,
	.hover-card.is-pinned .hover-card-pin { opacity: 1; }

	.hover-card-pin.pinned { background: rgba(0, 0, 0, 0.55); }

	.hover-card-cover {
		width: 100%;
		height: 100px;
		overflow: hidden;
		border-radius: 12px 12px 0 0;
	}

	.hover-card-cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.hover-card-body { padding: 10px 12px 12px; }

	.hover-card-title {
		margin: 0 0 4px;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.35;
		color: var(--text-primary, #111);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.hover-card-meta {
		margin: 0 0 3px;
		font-size: 11px;
		color: var(--text-muted, #888);
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.hover-card-dot { opacity: 0.5; }

	.is-clickable { cursor: pointer; }
	.is-clickable:hover { box-shadow: 0 10px 36px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1); }

	.hover-card-caret {
		position: absolute;
		bottom: -7px;
		left: calc(50% + var(--caret-x, 0px));
		transform: translateX(-50%);
		width: 14px;
		height: 7px;
		overflow: hidden;
	}

	.hover-card-caret::before {
		content: '';
		position: absolute;
		top: -7px;
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		width: 14px;
		height: 14px;
		background: var(--bg-canvas, #fff);
		box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.12);
	}

	/* ── Markers ────────────────────────────────────────────────────────────── */
	:global(.marker-pin) {
		background: none !important;
		border: none !important;
	}

	:global(.marker-img) {
		width: 44px !important;
		height: 44px !important;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--bg-canvas, #fff);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		box-sizing: border-box;
		display: block;
		aspect-ratio: 1;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		cursor: pointer;
	}

	:global(.marker-img:hover) {
		transform: scale(1.12);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
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
		background: var(--text-primary, #111);
		color: var(--bg-canvas, #fff);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-xl);
		font-weight: 500;
		border: 2px solid var(--bg-canvas, #fff);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		box-sizing: border-box;
		transition: transform 0.15s ease;
		cursor: pointer;
	}

	:global(.marker-placeholder:hover) { transform: scale(1.12); }
</style>
