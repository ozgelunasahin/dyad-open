<script lang="ts">
	import { onMount } from 'svelte';
	import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { select } from 'd3-selection';
	import 'd3-transition'; // Adds .transition() method to selections
	import type { Point } from '$lib/types';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import {
		routeConnection,
		pathToSvgWithHops,
		getCardEntryPoint
	} from '$lib/utils/pathfinding';
	import NoteCard from './NoteCard.svelte';
	import ConnectionLine from './ConnectionLine.svelte';

	let svg: SVGSVGElement;
	let transform = $state({ x: 0, y: 0, k: 1 });
	let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
	let zoomSpeed = 0.001;

	/**
	 * Find and focus the card under the viewport center.
	 */
	function updateFocusFromViewportCenter() {
		if (!svg) return;

		// Calculate viewport center in canvas coordinates
		const viewportCenterX = (svg.clientWidth / 2 - transform.x) / transform.k;
		const viewportCenterY = (svg.clientHeight / 2 - transform.y) / transform.k;

		// Find which card contains this point
		for (const card of canvasStore.cardList) {
			const inX = viewportCenterX >= card.position.x &&
			            viewportCenterX <= card.position.x + card.dimensions.width;
			const inY = viewportCenterY >= card.position.y &&
			            viewportCenterY <= card.position.y + card.dimensions.height;

			if (inX && inY) {
				if (canvasStore.focusedCardId !== card.id) {
					canvasStore.focusedCardId = card.id;
				}
				return;
			}
		}
	}

	onMount(() => {
		zoomBehavior = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 3])
			// Slow down zoom speed (default is ~0.002, we use 0.0005 for smoother zoom)
			.wheelDelta((event) => {
				return -event.deltaY * zoomSpeed;
			})
			// Only allow zoom on Ctrl+wheel, allow drag panning always
			.filter((event) => {
				// Always allow drag (mousedown/touchstart)
				if (event.type === 'mousedown' || event.type === 'touchstart') {
					return true;
				}
				// For wheel events, only zoom if Ctrl is held
				if (event.type === 'wheel') {
					return event.ctrlKey;
				}
				// Allow other events (dblclick for reset, etc.)
				return true;
			})
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
				updateFocusFromViewportCenter();
			});

		const selection = select(svg);
		selection.call(zoomBehavior);

		// Handle regular scroll for vertical panning within focused card
		function handleWheel(event: WheelEvent) {
			// Skip if Ctrl is held (let d3-zoom handle it for zooming)
			if (event.ctrlKey) return;

			event.preventDefault();

			const focusedCard = canvasStore.focusedCardId
				? canvasStore.cards.get(canvasStore.focusedCardId)
				: null;

			if (!focusedCard) {
				// No focused card - just pan freely
				const newY = transform.y - event.deltaY;
				const newTransform = zoomIdentity.translate(transform.x, newY).scale(transform.k);
				selection.call(zoomBehavior.transform, newTransform);
				return;
			}

			// Calculate vertical bounds based on focused card
			const viewportHeight = svg.clientHeight;
			const cardTop = focusedCard.position.y;
			const cardBottom = focusedCard.position.y + focusedCard.dimensions.height;
			const cardCenterY = (cardTop + cardBottom) / 2;

			// Convert to screen coordinates for bounds
			// When card top is at viewport center: transform.y = viewportHeight/2 - cardTop * transform.k
			// When card bottom is at viewport center: transform.y = viewportHeight/2 - cardBottom * transform.k
			const maxY = viewportHeight / 2 - cardTop * transform.k + 100; // Allow 100px past top
			const minY = viewportHeight / 2 - cardBottom * transform.k - 100; // Allow 100px past bottom

			// Apply scroll with bounds
			let newY = transform.y - event.deltaY;
			newY = Math.max(minY, Math.min(maxY, newY));

			const newTransform = zoomIdentity.translate(transform.x, newY).scale(transform.k);
			selection.call(zoomBehavior.transform, newTransform);
		}

		svg.addEventListener('wheel', handleWheel, { passive: false });

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

		// Set initial focus based on viewport center
		updateFocusFromViewportCenter();

		// Listen for focus animation requests
		const handleFocusAnimation = (event: Event) => {
			const customEvent = event as CustomEvent<{ x: number; y: number; cardId: string }>;
			animateToCenter(customEvent.detail.x, customEvent.detail.y);
		};

		window.addEventListener('canvas-focus', handleFocusAnimation);

		// Listen for zoom-to-fit requests
		const handleZoomToFit = () => {
			zoomToFitAll();
		};
		window.addEventListener('canvas-zoom-to-fit', handleZoomToFit);

		// Listen for compute-paths requests (for programmatic card creation)
		const handleComputePaths = () => {
			computeMissingPaths();
		};
		window.addEventListener('canvas-compute-paths', handleComputePaths);

		return () => {
			window.removeEventListener('canvas-focus', handleFocusAnimation);
			window.removeEventListener('canvas-zoom-to-fit', handleZoomToFit);
			window.removeEventListener('canvas-compute-paths', handleComputePaths);
			svg.removeEventListener('wheel', handleWheel);
		};
	});

	/**
	 * Zoom to fit all cards in the viewport with padding.
	 */
	function zoomToFitAll() {
		if (!svg) return;

		const bbox = canvasStore.getBoundingBox();
		if (!bbox) return;

		const padding = 50;
		const contentWidth = bbox.maxX - bbox.minX + padding * 2;
		const contentHeight = bbox.maxY - bbox.minY + padding * 2;

		const viewportWidth = svg.clientWidth;
		const viewportHeight = svg.clientHeight;

		// Calculate zoom to fit
		const scaleX = viewportWidth / contentWidth;
		const scaleY = viewportHeight / contentHeight;
		const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 1x

		// Calculate center of content
		const contentCenterX = (bbox.minX + bbox.maxX) / 2;
		const contentCenterY = (bbox.minY + bbox.maxY) / 2;

		// Calculate translation to center content
		const newX = viewportWidth / 2 - contentCenterX * newScale;
		const newY = viewportHeight / 2 - contentCenterY * newScale;

		// Apply transform
		const selection = select(svg);
		const newTransform = zoomIdentity.translate(newX, newY).scale(newScale);
		selection.transition().duration(500).call(zoomBehavior.transform, newTransform);
	}

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

	/**
	 * Compute and store a path for a new connection.
	 * Uses simple geometric routing (L-shape, Z-shape, around) without A*.
	 * @param routingX - Optional pre-assigned routing channel X from layout
	 */
	function computeAndStorePath(fromCardId: string, toCardId: string, sourcePoint: Point, routingX?: number): void {
		const fromCard = canvasStore.cards.get(fromCardId);
		const toCard = canvasStore.cards.get(toCardId);

		if (!fromCard || !toCard) {
			console.error('[Pathfinding] Missing cards for connection', { fromCardId, toCardId });
			return;
		}

		// Get all cards as array for obstacle checking
		const allCards = canvasStore.cardList;

		// Get existing paths for crossing detection
		const existingPaths = canvasStore.getExistingPathPoints();

		// Calculate start and end points
		const startPoint = sourcePoint;
		const endPoint = getCardEntryPoint(toCard, startPoint);

		// Route the connection with optional pre-assigned routing channel
		const result = routeConnection(
			startPoint,
			endPoint,
			allCards,
			fromCard,
			toCard,
			existingPaths,
			routingX
		);

		// Generate SVG path with hops where it crosses existing paths
		const connectionId = `${fromCardId}-${toCardId}`;
		const svgPath = pathToSvgWithHops(result.path, existingPaths);

		// Store the computed path (frozen forever)
		canvasStore.storePath(fromCardId, toCardId, {
			points: result.path,
			svgPath,
			method: result.method,
			failed: result.failed
		});

		console.log(
			`[Pathfinding] ${connectionId}: ${result.method}`,
			result.path.length, 'points',
			result.failed ? '(FAILED)' : ''
		);
	}

	function handleLinkClick(noteId: string, fromCardId: string, screenPosition: Point) {
		// Convert screen position to canvas coordinates
		const svgRect = svg.getBoundingClientRect();
		const canvasPosition: Point = {
			x: (screenPosition.x - svgRect.left - transform.x) / transform.k,
			y: (screenPosition.y - svgRect.top - transform.y) / transform.k
		};

		// Check if note is already open (will just refocus)
		const noteAlreadyOpen = canvasStore.cards.has(noteId);

		canvasStore.openNote(noteId, fromCardId, canvasPosition);

		// Compute and store path for new connection
		// Only do this if a new card was actually created
		if (!noteAlreadyOpen && canvasStore.cards.has(noteId)) {
			computeAndStorePath(fromCardId, noteId, canvasPosition);
		}
	}

	/**
	 * Compute paths for all connections that don't have stored paths yet.
	 * Used when cards are opened programmatically (e.g., openAllLinks).
	 */
	function computeMissingPaths(): void {
		for (const conn of canvasStore.connections) {
			const existingPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (!existingPath) {
				computeAndStorePath(conn.fromCardId, conn.toCardId, conn.sourcePoint, conn.routingX);
			}
		}

		// After all paths are computed, regenerate SVGs so every path sees all others for crossings
		regenerateAllPathSvgs();
	}

	/**
	 * Regenerate SVG paths for all stored connections.
	 * This ensures every path has hops where it crosses ANY other path,
	 * not just paths that existed when it was first computed.
	 */
	function regenerateAllPathSvgs(): void {
		const allPathPoints = canvasStore.getExistingPathPoints();

		for (const conn of canvasStore.connections) {
			const storedPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
			if (!storedPath) continue;

			// Get all OTHER paths (exclude self)
			const otherPaths = allPathPoints.filter(p => p !== storedPath.points);

			// Regenerate SVG with hops considering all other paths
			const newSvgPath = pathToSvgWithHops(storedPath.points, otherPaths);

			// Update the stored path with new SVG
			canvasStore.storePath(conn.fromCardId, conn.toCardId, {
				...storedPath,
				svgPath: newSvgPath
			});
		}
	}


	// Pen-and-paper approach: paths are stored when connections are created
	// This derived just reads from stored paths
	let connectionPaths = $derived.by(() => {
		const results: Array<{
			fromCardId: string;
			toCardId: string;
			sourcePoint: Point;
			path: string;
			pathFailed: boolean;
			method?: string;
		}> = [];

		for (const conn of canvasStore.connections) {
			const storedPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);

			if (storedPath) {
				results.push({
					...conn,
					path: storedPath.svgPath,
					pathFailed: storedPath.failed,
					method: storedPath.method
				});
			} else {
				// No stored path yet (shouldn't happen in normal flow)
				results.push({
					...conn,
					path: '',
					pathFailed: true,
					method: 'none'
				});
			}
		}

		return results;
	});
</script>

<svg bind:this={svg} class="canvas" class:debug-active={canvasStore.debugMode}>
	<g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
		<!-- Debug grid overlay - show card obstacle zones and path obstacle corridors -->
		{#if canvasStore.debugMode}
			<g class="debug-grid">
				<!-- Card obstacle zones (20px padding around cards) -->
				{#each canvasStore.cardList as card (card.id)}
					<rect
						x={card.position.x - 20}
						y={card.position.y - 20}
						width={card.dimensions.width + 40}
						height={card.dimensions.height + 40}
						class="cell-obstacle"
					/>
				{/each}
				<!-- Path obstacle corridors (3-cell padding = ~30px on each side) -->
				{#each connectionPaths as conn (conn.fromCardId + '-' + conn.toCardId + '-obstacle')}
					{#if conn.path}
						<path
							d={conn.path}
							class="path-obstacle"
						/>
					{/if}
				{/each}
			</g>
		{/if}

		<!-- Connection lines (rendered below cards) -->
		{#each connectionPaths as conn (conn.fromCardId + '-' + conn.toCardId)}
			<ConnectionLine path={conn.path} pathFailed={conn.pathFailed} />
		{/each}

		<!-- Debug: Show routing method labels -->
		{#if canvasStore.debugMode}
			{#each connectionPaths as conn (conn.fromCardId + '-' + conn.toCardId + '-debug')}
				{#if conn.method}
					{@const fromCard = canvasStore.cards.get(conn.fromCardId)}
					{#if fromCard}
						<g class="debug-method-label" transform="translate({conn.sourcePoint.x + 15}, {conn.sourcePoint.y - 5})">
							<rect
								x="-2"
								y="-10"
								width={conn.method.length * 6 + 4}
								height="14"
								fill={conn.method === 'L-shape' ? '#22c55e' :
									  conn.method === 'Z-shape' ? '#3b82f6' :
									  conn.method === 'around' ? '#f97316' : '#ef4444'}
								fill-opacity="0.8"
								rx="2"
							/>
							<text
								x="0"
								y="0"
								fill="white"
								font-size="9"
								font-family="monospace"
							>{conn.method}</text>
						</g>
					{/if}
				{/if}
			{/each}
		{/if}

		<!-- Note cards -->
		{#each canvasStore.cardList as card (card.id)}
			<NoteCard {card} isActive={canvasStore.focusedCardId === card.id} onLinkClick={handleLinkClick} />
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

	.canvas.debug-active {
		background:
			linear-gradient(90deg, rgba(74, 222, 128, 0.03) 1px, transparent 1px),
			linear-gradient(rgba(74, 222, 128, 0.03) 1px, transparent 1px),
			var(--bg-canvas);
		background-size: 20px 20px, 20px 20px, 100% 100%;
	}

	/* Debug visualization styles */
	.debug-grid .cell-obstacle {
		fill: #ef4444;
		fill-opacity: 0.3;
		stroke: #ef4444;
		stroke-opacity: 0.4;
		stroke-width: 0.5;
	}

	.debug-grid .path-obstacle {
		fill: none;
		stroke: #f97316;
		stroke-opacity: 0.4;
		stroke-width: 20;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
