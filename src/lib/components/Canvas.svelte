<script lang="ts">
	import { onMount } from 'svelte';
	import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { select } from 'd3-selection';
	import type { Point, Card } from '$lib/types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import {
		PathfindingGrid,
		findPathWithInitialDirection,
		pathToSvgWithRoundedCorners,
		getCardEntryPoint
	} from '$lib/utils/pathfinding';
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

		// Listen for focus animation requests
		const handleFocusAnimation = (event: Event) => {
			const customEvent = event as CustomEvent<{ x: number; y: number; cardId: string }>;
			animateToCenter(customEvent.detail.x, customEvent.detail.y);
		};

		window.addEventListener('canvas-focus', handleFocusAnimation);

		return () => {
			window.removeEventListener('canvas-focus', handleFocusAnimation);
		};
	});

	/**
	 * Smoothly animate the view to center on a point.
	 */
	function animateToCenter(targetX: number, targetY: number) {
		if (!svg) return;

		const selection = select(svg);
		const width = svg.clientWidth;
		const height = svg.clientHeight;

		// Calculate target transform to center on point
		const endX = width / 2 - targetX * transform.k;
		const endY = height / 2 - targetY * transform.k;

		const startX = transform.x;
		const startY = transform.y;

		const duration = 400;
		const startTime = Date.now();

		function animate() {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease out quad
			const eased = 1 - (1 - progress) * (1 - progress);

			const currentX = startX + (endX - startX) * eased;
			const currentY = startY + (endY - startY) * eased;

			const newTransform = zoomIdentity.translate(currentX, currentY).scale(transform.k);

			selection.call(zoomBehavior.transform, newTransform);

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				canvasStore.setAnimating(false);
			}
		}

		requestAnimationFrame(animate);
	}

	function handleLinkClick(noteId: string, fromCardId: string, screenPosition: Point) {
		// Convert screen position to canvas coordinates
		const svgRect = svg.getBoundingClientRect();
		const canvasPosition: Point = {
			x: (screenPosition.x - svgRect.left - transform.x) / transform.k,
			y: (screenPosition.y - svgRect.top - transform.y) / transform.k
		};

		canvasStore.openNote(noteId, fromCardId, canvasPosition);
	}

	// Build pathfinding grid once when cards change (cached)
	let pathfindingGrid = $derived.by(() => {
		return new PathfindingGrid(canvasStore.cardList);
	});

	// Compute connection paths with A* pathfinding (using cached grid)
	let connectionPaths = $derived.by(() => {
		return canvasStore.connections.map((conn) => {
			const fromCard = canvasStore.cards.get(conn.fromCardId);
			const toCard = canvasStore.cards.get(conn.toCardId);

			if (!fromCard || !toCard) {
				return { ...conn, path: '', isActive: false };
			}

			// Clone grid and clear source/target regions
			const grid = pathfindingGrid.clone();
			grid.clearRegion(fromCard);
			grid.clearRegion(toCard);

			// Get start and end points
			const startPoint = conn.sourcePoint;
			const endPoint = getCardEntryPoint(toCard, startPoint);

			// Find path with forced downward exit from link underline
			const pathPoints = findPathWithInitialDirection(grid, startPoint, endPoint, true);

			// Generate SVG path
			const path =
				pathPoints.length >= 2
					? pathToSvgWithRoundedCorners(pathPoints, 8)
					: `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;

			const isActive = canvasStore.isConnectionActive(conn);

			return { ...conn, path, isActive };
		});
	});
</script>

<svg bind:this={svg} class="canvas">
	<g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
		<!-- Connection lines (rendered below cards) -->
		{#each connectionPaths as conn (conn.fromCardId + '-' + conn.toCardId)}
			<ConnectionLine path={conn.path} isActive={conn.isActive} />
		{/each}

		<!-- Note cards -->
		{#each canvasStore.cardList as card (card.id)}
			<NoteCard {card} isActive={canvasStore.isInActiveChain(card.id)} onLinkClick={handleLinkClick} />
		{/each}
	</g>
</svg>

<style>
	.canvas {
		width: 100%;
		height: 100%;
		background: var(--bg-canvas);
		cursor: grab;
		transition: background 0.3s ease;
	}

	.canvas:active {
		cursor: grabbing;
	}
</style>
