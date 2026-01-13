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
 * Supports bidirectional routing (left or right exit based on target position)
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

	// Determine direction based on target position relative to source
	const sourceRightEdge = sourceCard.position.x + sourceCard.dimensions.width;
	const sourceLeftEdge = sourceCard.position.x;
	const targetRightEdge = targetCard.position.x + targetCard.dimensions.width;
	const targetLeftEdge = targetCard.position.x;

	// Target center determines exit direction
	const targetCenterX = targetCard.position.x + targetCard.dimensions.width / 2;
	const sourceCenterX = sourceCard.position.x + sourceCard.dimensions.width / 2;
	const exitRight = targetCenterX > sourceCenterX;

	const headingY = targetCard.position.y + 20; // Heading is ~20px from top

	let exitX: number;
	let exitPoint: Point;
	let entryX: number;
	let entryPoint: Point;
	let verticalX: number;

	if (exitRight) {
		// Exit to the right, enter from the left (standard case)
		exitX = sourceRightEdge + 10;
		exitPoint = { x: exitX, y: start.y };
		entryX = targetLeftEdge - 10;
		entryPoint = { x: entryX, y: headingY };

		verticalX = findVerticalRoutingX(
			exitX,
			entryX,
			Math.min(start.y, headingY),
			Math.max(start.y, headingY),
			cards,
			sourceCard,
			targetCard,
			existingPaths
		);
	} else {
		// Exit to the left, enter from the right (reverse case)
		exitX = sourceLeftEdge - 10;
		exitPoint = { x: exitX, y: start.y };
		entryX = targetRightEdge + 10;
		entryPoint = { x: entryX, y: headingY };

		verticalX = findVerticalRoutingX(
			entryX,  // Swap order for left-exit routing
			exitX,
			Math.min(start.y, headingY),
			Math.max(start.y, headingY),
			cards,
			sourceCard,
			targetCard,
			existingPaths
		);
	}

	// Build the path - start from link underline position
	// The line extends from the link text itself, blending with the underline
	const path: Point[] = [
		start,                              // Start at the link underline position
		exitPoint,                          // Go horizontally to exit the card
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
		method: exitRight ? 'Z-route' : 'Z-route-L',
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
 * Find crossing points between a path segment and existing paths.
 * Optimized for orthogonal (horizontal/vertical only) paths.
 */
function findCrossingsOnSegment(
	segStart: Point,
	segEnd: Point,
	existingPaths: Point[][]
): Point[] {
	const crossings: Point[] = [];

	// Determine if our segment is horizontal or vertical
	const isHorizontal = Math.abs(segEnd.y - segStart.y) < 1;
	const isVertical = Math.abs(segEnd.x - segStart.x) < 1;

	if (!isHorizontal && !isVertical) {
		// Diagonal segment - use general intersection (shouldn't happen in orthogonal routing)
		return crossings;
	}

	for (const path of existingPaths) {
		for (let j = 0; j < path.length - 1; j++) {
			const otherStart = path[j];
			const otherEnd = path[j + 1];

			// Determine if other segment is horizontal or vertical
			const otherIsHorizontal = Math.abs(otherEnd.y - otherStart.y) < 1;
			const otherIsVertical = Math.abs(otherEnd.x - otherStart.x) < 1;

			// Only horizontal-vertical pairs can cross
			if (isHorizontal && otherIsVertical) {
				// Our segment is horizontal, other is vertical
				const horzY = segStart.y;
				const horzMinX = Math.min(segStart.x, segEnd.x);
				const horzMaxX = Math.max(segStart.x, segEnd.x);

				const vertX = otherStart.x;
				const vertMinY = Math.min(otherStart.y, otherEnd.y);
				const vertMaxY = Math.max(otherStart.y, otherEnd.y);

				// Check if they cross (strictly inside, not at endpoints)
				if (vertX > horzMinX + 1 && vertX < horzMaxX - 1 &&
					horzY > vertMinY + 1 && horzY < vertMaxY - 1) {
					crossings.push({ x: vertX, y: horzY });
				}
			} else if (isVertical && otherIsHorizontal) {
				// Our segment is vertical, other is horizontal
				const vertX = segStart.x;
				const vertMinY = Math.min(segStart.y, segEnd.y);
				const vertMaxY = Math.max(segStart.y, segEnd.y);

				const horzY = otherStart.y;
				const horzMinX = Math.min(otherStart.x, otherEnd.x);
				const horzMaxX = Math.max(otherStart.x, otherEnd.x);

				// Check if they cross (strictly inside, not at endpoints)
				if (vertX > horzMinX + 1 && vertX < horzMaxX - 1 &&
					horzY > vertMinY + 1 && horzY < vertMaxY - 1) {
					crossings.push({ x: vertX, y: horzY });
				}
			}
			// Parallel segments (both horizontal or both vertical) can't cross
		}
	}

	// Sort crossings along the segment direction
	const dx = segEnd.x - segStart.x;
	const dy = segEnd.y - segStart.y;

	crossings.sort((a, b) => {
		if (Math.abs(dx) > Math.abs(dy)) {
			// Horizontal segment - sort by x
			return (a.x - segStart.x) - (b.x - segStart.x);
		} else {
			// Vertical segment - sort by y
			return (a.y - segStart.y) - (b.y - segStart.y);
		}
	});

	return crossings;
}

/**
 * Calculate the intersection point of two line segments.
 */
function getIntersectionPoint(
	p1: Point, p2: Point,
	p3: Point, p4: Point
): Point | null {
	const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
	if (Math.abs(denom) < 0.001) return null;

	const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;

	return {
		x: p1.x + ua * (p2.x - p1.x),
		y: p1.y + ua * (p2.y - p1.y)
	};
}

const HOP_RADIUS = 6;

/**
 * Generate SVG path string with hops (arcs) where it crosses existing paths.
 */
export function pathToSvgWithHops(points: Point[], existingPaths: Point[][]): string {
	if (points.length < 2) return '';

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];

		const isHorizontal = Math.abs(curr.y - prev.y) < 0.5;
		const isVertical = Math.abs(curr.x - prev.x) < 0.5;
		const goingRight = curr.x > prev.x;
		const goingDown = curr.y > prev.y;

		// Find crossings on this segment
		const crossings = findCrossingsOnSegment(prev, curr, existingPaths);

		if (crossings.length === 0) {
			// No crossings - simple segment
			if (isHorizontal) {
				d += ` H ${curr.x}`;
			} else if (isVertical) {
				d += ` V ${curr.y}`;
			} else {
				d += ` H ${curr.x} V ${curr.y}`;
			}
		} else {
			// Has crossings - add hops
			// Sort crossings in the direction of travel
			if (isHorizontal) {
				crossings.sort((a, b) => goingRight ? a.x - b.x : b.x - a.x);
			} else {
				crossings.sort((a, b) => goingDown ? a.y - b.y : b.y - a.y);
			}

			let lastPos = isHorizontal ? prev.x : prev.y;

			for (const crossing of crossings) {
				if (isHorizontal) {
					const hopStart = goingRight ? crossing.x - HOP_RADIUS : crossing.x + HOP_RADIUS;
					const hopEnd = goingRight ? crossing.x + HOP_RADIUS : crossing.x - HOP_RADIUS;

					// Draw to just before crossing
					if (goingRight ? hopStart > lastPos + 1 : hopStart < lastPos - 1) {
						d += ` H ${hopStart}`;
					}
					// Arc over the crossing (semicircle)
					// sweep-flag: 1 for going right, 0 for going left
					d += ` A ${HOP_RADIUS} ${HOP_RADIUS} 0 0 ${goingRight ? 1 : 0} ${hopEnd} ${crossing.y}`;
					lastPos = hopEnd;
				} else if (isVertical) {
					const hopStart = goingDown ? crossing.y - HOP_RADIUS : crossing.y + HOP_RADIUS;
					const hopEnd = goingDown ? crossing.y + HOP_RADIUS : crossing.y - HOP_RADIUS;

					// Draw to just before crossing
					if (goingDown ? hopStart > lastPos + 1 : hopStart < lastPos - 1) {
						d += ` V ${hopStart}`;
					}
					// Arc over the crossing (semicircle)
					d += ` A ${HOP_RADIUS} ${HOP_RADIUS} 0 0 ${goingDown ? 0 : 1} ${crossing.x} ${hopEnd}`;
					lastPos = hopEnd;
				}
			}

			// Finish segment
			if (isHorizontal) {
				d += ` H ${curr.x}`;
			} else if (isVertical) {
				d += ` V ${curr.y}`;
			}
		}
	}

	return d;
}

/**
 * Calculate entry point on a card - just outside the edge at heading level.
 * Entry side depends on where the connection is coming from.
 */
export function getCardEntryPoint(card: Card, fromPoint: Point): Point {
	const cardCenterX = card.position.x + card.dimensions.width / 2;
	const enterFromLeft = fromPoint.x < cardCenterX;

	return {
		x: enterFromLeft ? card.position.x - 8 : card.position.x + card.dimensions.width + 8,
		y: card.position.y + 20
	};
}
