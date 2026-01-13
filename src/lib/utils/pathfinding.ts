import type { Card, Point } from '$lib/types';

/**
 * Simple orthogonal routing for newspaper-style layout.
 *
 * Path structure:
 * 1. Exit source card horizontally (at link Y position)
 * 2. Go vertical in the routing gap between card columns
 * 3. Enter target card horizontally (at heading Y position)
 *
 * This creates clean Z-shaped or S-shaped paths that never cross card content.
 */

/**
 * Route a connection between two cards.
 * Creates an orthogonal path: horizontal → vertical → horizontal
 */
export function routeConnection(
	start: Point,
	end: Point,
	cards: Card[],
	sourceCard: Card | null,
	targetCard: Card | null,
	existingPaths: Point[][] = []
): { path: Point[]; method: string; failed: boolean } {
	if (!sourceCard || !targetCard) {
		return {
			path: [start, end],
			method: 'direct',
			failed: true
		};
	}

	// Calculate key X positions
	const sourceRightEdge = sourceCard.position.x + sourceCard.dimensions.width;
	const targetLeftEdge = targetCard.position.x;

	// Exit point: just outside source card's right edge, at link Y
	const exitX = sourceRightEdge + 10;
	const exitPoint = { x: exitX, y: start.y };

	// Entry point: just outside target card's left edge, at heading Y
	const entryX = targetLeftEdge - 10;
	const headingY = targetCard.position.y + 20; // Heading is ~20px from top
	const entryPoint = { x: entryX, y: headingY };

	// Find the best X position for the vertical segment
	// It should be in the gap between source and target, avoiding other cards
	const verticalX = findVerticalRoutingX(
		exitX,
		entryX,
		Math.min(start.y, headingY),
		Math.max(start.y, headingY),
		cards,
		sourceCard,
		targetCard,
		existingPaths
	);

	// Build the path - start from card edge, not inside text
	// This prevents lines from crossing through the source card's content
	const path: Point[] = [
		exitPoint,                          // Start just outside source card's right edge
		{ x: verticalX, y: start.y },       // Move to vertical routing channel
		{ x: verticalX, y: headingY },      // Go vertical to target row
		entryPoint,                         // Approach target
		end                                 // Entry point on target
	];

	// Compress path (remove redundant points on straight lines)
	const compressed = compressPath(path);

	// Check if path crosses any existing paths
	const hasCrossing = checkPathCrossings(compressed, existingPaths);

	return {
		path: compressed,
		method: 'Z-route',
		failed: hasCrossing
	};
}

/**
 * Find the best X position for the vertical segment of the path.
 * Tries the middle of the gap first, then searches for alternatives.
 * Checks both card obstacles and existing path crossings.
 */
function findVerticalRoutingX(
	exitX: number,
	entryX: number,
	minY: number,
	maxY: number,
	cards: Card[],
	sourceCard: Card,
	targetCard: Card,
	existingPaths: Point[][]
): number {
	const gapWidth = entryX - exitX;
	const midX = exitX + gapWidth / 2;

	// Try middle first
	if (isVerticalClear(midX, minY, maxY, cards, sourceCard, targetCard) &&
		!verticalCrossesExistingPaths(midX, minY, maxY, existingPaths)) {
		return midX;
	}

	// Try positions from middle outward with finer granularity
	const offsets: number[] = [];
	for (let i = 5; i <= 50; i += 5) {
		offsets.push(i, -i);
	}

	for (const offset of offsets) {
		const x = midX + offset;
		if (x > exitX + 5 && x < entryX - 5) {
			if (isVerticalClear(x, minY, maxY, cards, sourceCard, targetCard) &&
				!verticalCrossesExistingPaths(x, minY, maxY, existingPaths)) {
				return x;
			}
		}
	}

	// Fallback to middle (may have crossings)
	return midX;
}

/**
 * Check if a vertical segment would cross any existing paths.
 */
function verticalCrossesExistingPaths(
	x: number,
	minY: number,
	maxY: number,
	existingPaths: Point[][]
): boolean {
	const verticalSegmentStart = { x, y: minY };
	const verticalSegmentEnd = { x, y: maxY };

	for (const path of existingPaths) {
		for (let i = 0; i < path.length - 1; i++) {
			const segStart = path[i];
			const segEnd = path[i + 1];

			// Check if horizontal segment of existing path crosses our vertical
			if (Math.abs(segStart.y - segEnd.y) < 1) {
				// This is a horizontal segment
				const segMinX = Math.min(segStart.x, segEnd.x);
				const segMaxX = Math.max(segStart.x, segEnd.x);
				const segY = segStart.y;

				// Check if our vertical line crosses this horizontal segment
				if (x > segMinX && x < segMaxX && segY > minY && segY < maxY) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Check if a vertical line at X from minY to maxY is clear of cards.
 */
function isVerticalClear(
	x: number,
	minY: number,
	maxY: number,
	cards: Card[],
	sourceCard: Card,
	targetCard: Card
): boolean {
	const padding = 15;

	for (const card of cards) {
		if (card.id === sourceCard.id || card.id === targetCard.id) continue;

		const cardLeft = card.position.x - padding;
		const cardRight = card.position.x + card.dimensions.width + padding;
		const cardTop = card.position.y - padding;
		const cardBottom = card.position.y + card.dimensions.height + padding;

		// Check if vertical line passes through card
		if (x >= cardLeft && x <= cardRight) {
			if (maxY >= cardTop && minY <= cardBottom) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Check if a path crosses any existing paths.
 */
function checkPathCrossings(path: Point[], existingPaths: Point[][]): boolean {
	for (const existing of existingPaths) {
		for (let i = 0; i < path.length - 1; i++) {
			for (let j = 0; j < existing.length - 1; j++) {
				if (segmentsIntersect(path[i], path[i + 1], existing[j], existing[j + 1])) {
					// Allow shared endpoints
					if (!sharesEndpoint(path[i], path[i + 1], existing[j], existing[j + 1])) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

function sharesEndpoint(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
	return (
		pointsClose(p1, p3) || pointsClose(p1, p4) ||
		pointsClose(p2, p3) || pointsClose(p2, p4)
	);
}

function pointsClose(a: Point, b: Point): boolean {
	return Math.abs(a.x - b.x) < 3 && Math.abs(a.y - b.y) < 3;
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
	const d1 = direction(p3, p4, p1);
	const d2 = direction(p3, p4, p2);
	const d3 = direction(p1, p2, p3);
	const d4 = direction(p1, p2, p4);

	if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
		((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
		return true;
	}

	return false;
}

function direction(p1: Point, p2: Point, p3: Point): number {
	return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

/**
 * Remove intermediate points on straight lines and duplicate points.
 */
function compressPath(path: Point[]): Point[] {
	if (path.length < 2) return path;

	const compressed: Point[] = [path[0]];

	for (let i = 1; i < path.length; i++) {
		const prev = compressed[compressed.length - 1];
		const curr = path[i];

		// Skip duplicate points
		if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) {
			continue;
		}

		// For intermediate points, check if direction changes
		if (i < path.length - 1) {
			const next = path[i + 1];
			const dx1 = Math.sign(curr.x - prev.x);
			const dy1 = Math.sign(curr.y - prev.y);
			const dx2 = Math.sign(next.x - curr.x);
			const dy2 = Math.sign(next.y - curr.y);

			// Keep point only if direction changes
			if (dx1 !== dx2 || dy1 !== dy2) {
				compressed.push(curr);
			}
		} else {
			// Always keep the last point
			compressed.push(curr);
		}
	}

	return compressed;
}

/**
 * Generate SVG path string with only horizontal and vertical segments.
 */
export function pathToSvg(points: Point[]): string {
	if (points.length < 2) return '';

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];

		if (Math.abs(curr.y - prev.y) < 0.5) {
			d += ` H ${curr.x}`;
		} else if (Math.abs(curr.x - prev.x) < 0.5) {
			d += ` V ${curr.y}`;
		} else {
			// Force orthogonal
			d += ` H ${curr.x} V ${curr.y}`;
		}
	}

	return d;
}

/**
 * Calculate entry point on a card - just outside the left edge at heading level.
 */
export function getCardEntryPoint(card: Card, _fromPoint: Point): Point {
	return {
		x: card.position.x - 8,
		y: card.position.y + 20
	};
}
