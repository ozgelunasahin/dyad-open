<script lang="ts">
	import { onMount } from 'svelte';
	import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { select } from 'd3-selection';
	import type { Point } from '$lib/types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { getConnectionPoints } from '$lib/utils/layout';
	import NoteCard from './NoteCard.svelte';
	import ConnectionLine from './ConnectionLine.svelte';

	let svg: SVGSVGElement;
	let transform = $state({ x: 0, y: 0, k: 1 });
	let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;

	onMount(() => {
		zoomBehavior = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 3])
			.on('zoom', (event) => {
				transform = {
					x: event.transform.x,
					y: event.transform.y,
					k: event.transform.k
				};
				canvasStore.updateCamera({
					x: event.transform.x,
					y: event.transform.y,
					zoom: event.transform.k
				});
			});

		const selection = select(svg);
		selection.call(zoomBehavior);

		// Restore camera position from store
		const storedCamera = canvasStore.camera;
		if (storedCamera.x !== 0 || storedCamera.y !== 0 || storedCamera.zoom !== 1) {
			const initialTransform = zoomIdentity
				.translate(storedCamera.x, storedCamera.y)
				.scale(storedCamera.zoom);
			selection.call(zoomBehavior.transform, initialTransform);
		} else {
			// Center initial view
			const width = svg.clientWidth;
			const height = svg.clientHeight;
			const initialTransform = zoomIdentity.translate(width / 2, height / 2);
			selection.call(zoomBehavior.transform, initialTransform);
		}
	});

	function handleLinkClick(noteId: string, fromCardId: string, screenPosition: Point) {
		// Convert screen position to canvas coordinates
		const svgRect = svg.getBoundingClientRect();
		const canvasPosition: Point = {
			x: (screenPosition.x - svgRect.left - transform.x) / transform.k,
			y: (screenPosition.y - svgRect.top - transform.y) / transform.k
		};

		canvasStore.openNote(noteId, fromCardId, canvasPosition);
	}

	// Compute connection line endpoints
	let connectionData = $derived.by(() => {
		return canvasStore.connections.map((conn) => {
			const fromCard = canvasStore.cards.get(conn.fromCardId);
			const toCard = canvasStore.cards.get(conn.toCardId);

			if (!fromCard || !toCard) return null;

			const points = getConnectionPoints(fromCard, toCard, conn.sourcePoint);
			const isActive = canvasStore.isConnectionActive(conn);

			return {
				...conn,
				from: points.from,
				to: points.to,
				isActive
			};
		}).filter((c) => c !== null);
	});
</script>

<svg bind:this={svg} class="canvas">
	<defs>
		<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
			<circle cx="1" cy="1" r="1" fill="#e2e8f0" />
		</pattern>
	</defs>

	<g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
		<!-- Background grid -->
		<rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" />

		<!-- Connection lines (rendered below cards) -->
		{#each connectionData as conn (conn.fromCardId + '-' + conn.toCardId)}
			<ConnectionLine from={conn.from} to={conn.to} isActive={conn.isActive} />
		{/each}

		<!-- Note cards -->
		{#each canvasStore.cardList as card (card.id)}
			<NoteCard
				{card}
				isActive={canvasStore.isInActiveChain(card.id)}
				onLinkClick={handleLinkClick}
			/>
		{/each}
	</g>
</svg>

<style>
	.canvas {
		width: 100%;
		height: 100%;
		background: #f8fafc;
		cursor: grab;
	}

	.canvas:active {
		cursor: grabbing;
	}
</style>
