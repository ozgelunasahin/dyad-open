import type { Card, Point } from '$lib/types';

/**
 * Coaxial overlap detection result.
 */
export interface CoaxialOverlap {
	count: number;        // Number of coaxial segment pairs
	totalLength: number;  // Total pixels of overlap
}

/**
 * Detect coaxial (parallel and overlapping) segments between a path and existing paths.
 * Coaxial overlap is when two segments run along the same line (same X for vertical, same Y for horizontal).
 */
export function detectCoaxialOverlap(
	newPath: Point[],
	existingPaths: Point[][]
): CoaxialOverlap {
	let count = 0;
	let totalLength = 0;
	const tolerance = 5; // Pixels - segments within this distance are considered coaxial

	for (let i = 0; i < newPath.length - 1; i++) {
		const seg1Start = newPath[i];
		const seg1End = newPath[i + 1];

		const isHorizontal1 = Math.abs(seg1End.y - seg1Start.y) < 1;
		const isVertical1 = Math.abs(seg1End.x - seg1Start.x) < 1;

		if (!isHorizontal1 && !isVertical1) continue;

		for (const existingPath of existingPaths) {
			for (let j = 0; j < existingPath.length - 1; j++) {
				const seg2Start = existingPath[j];
				const seg2End = existingPath[j + 1];

				const isHorizontal2 = Math.abs(seg2End.y - seg2Start.y) < 1;
				const isVertical2 = Math.abs(seg2End.x - seg2Start.x) < 1;

				// Both must be same orientation (both horizontal or both vertical)
				if (isHorizontal1 && isHorizontal2) {
					// Check if same Y (within tolerance)
					if (Math.abs(seg1Start.y - seg2Start.y) < tolerance) {
						// Check X range overlap
						const min1 = Math.min(seg1Start.x, seg1End.x);
						const max1 = Math.max(seg1Start.x, seg1End.x);
						const min2 = Math.min(seg2Start.x, seg2End.x);
						const max2 = Math.max(seg2Start.x, seg2End.x);

						const overlapStart = Math.max(min1, min2);
						const overlapEnd = Math.min(max1, max2);

						if (overlapEnd > overlapStart + 1) {
							count++;
							totalLength += overlapEnd - overlapStart;
						}
					}
				} else if (isVertical1 && isVertical2) {
					// Check if same X (within tolerance)
					if (Math.abs(seg1Start.x - seg2Start.x) < tolerance) {
						// Check Y range overlap
						const min1 = Math.min(seg1Start.y, seg1End.y);
						const max1 = Math.max(seg1Start.y, seg1End.y);
						const min2 = Math.min(seg2Start.y, seg2End.y);
						const max2 = Math.max(seg2Start.y, seg2End.y);

						const overlapStart = Math.max(min1, min2);
						const overlapEnd = Math.min(max1, max2);

						if (overlapEnd > overlapStart + 1) {
							count++;
							totalLength += overlapEnd - overlapStart;
						}
					}
				}
			}
		}
	}

	return { count, totalLength };
}

/**
 * Find vertical X positions already used by existing paths in a given X range.
 */
export function findUsedVerticalChannels(
	existingPaths: Point[][],
	minX: number,
	maxX: number
): number[] {
	const channels: number[] = [];

	for (const path of existingPaths) {
		for (let i = 0; i < path.length - 1; i++) {
			const start = path[i];
			const end = path[i + 1];

			// Check if this is a vertical segment
			if (Math.abs(end.x - start.x) < 1) {
				const x = start.x;
				if (x >= minX && x <= maxX) {
					// Only add if not already tracked (within tolerance)
					if (!channels.some(c => Math.abs(c - x) < 10)) {
						channels.push(x);
					}
				}
			}
		}
	}

	return channels.sort((a, b) => a - b);
}

/**
 * Simulate a path without storing it - for candidate scoring.
 * Matches the routing logic in routeConnection.
 */
export function simulatePath(
	start: Point,
	targetPosition: Point,
	sourceCard: Card,
	targetDimensions: { width: number; height: number },
	routingX?: number
): Point[] {
	const sourceRightEdge = sourceCard.position.x + sourceCard.dimensions.width;
	const targetCenterX = targetPosition.x + targetDimensions.width / 2;
	const sourceCenterX = sourceCard.position.x + sourceCard.dimensions.width / 2;
	const exitRight = targetCenterX > sourceCenterX;
	const headingY = targetPosition.y + 20;

	if (exitRight) {
		// Right-going: Z-shape (horizontal → vertical → horizontal)
		const exitX = sourceRightEdge + 10;
		const entryX = targetPosition.x - 10;
		const verticalX = routingX ?? (exitX + entryX) / 2;

		return [
			start,
			{ x: exitX, y: start.y },
			{ x: verticalX, y: start.y },
			{ x: verticalX, y: headingY },
			{ x: entryX, y: headingY }
		];
	} else {
		// Left-going: L-shape (horizontal → vertical)
		const entryX = targetPosition.x - 10;

		return [
			start,
			{ x: entryX, y: start.y },
			{ x: entryX, y: headingY }
		];
	}
}

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
 * @param preferredRoutingX - Optional pre-assigned routing channel X from layout
 */
export function routeConnection(
	start: Point,
	end: Point,
	cards: Card[],
	sourceCard: Card | null,
	targetCard: Card | null,
	existingPaths: Point[][] = [],
	preferredRoutingX?: number
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

		// Use preferred routing X if provided and valid, otherwise find one
		if (preferredRoutingX !== undefined && preferredRoutingX > exitX && preferredRoutingX < entryX) {
			verticalX = preferredRoutingX;
		} else {
			verticalX = findVerticalRoutingX(
				exitX,
				entryX,
				Math.min(start.y, headingY),
				Math.max(start.y, headingY),
				cards,
				sourceCard,
				targetCard,
				existingPaths,
				start.y // Pass source link Y for offset calculation
			);
		}
	} else {
		// Exit to the left - simple L-shape: go LEFT then DOWN
		// Target card should be positioned lower so the line drops down
		entryX = targetLeftEdge - 10;
		entryPoint = { x: entryX, y: headingY };

		// L-shape: horizontal to entry X, then vertical down to entry Y
		// No separate exit point needed - go directly to entry X
		exitX = entryX; // Vertical segment is at entry X
		exitPoint = { x: exitX, y: start.y };
		verticalX = entryX; // Vertical channel is at entry point X
	}

	// Build the path - start from link underline position
	// The line extends from the link text itself, blending with the underline
	// For right-exit: Z-shape entering from left at heading level
	// For left-exit: route above, enter at top-left corner
	const verticalEndY = exitRight ? headingY : entryPoint.y;

	const path: Point[] = [
		start,                              // Start at the link underline position
		exitPoint,                          // Go horizontally to exit the card
		{ x: verticalX, y: start.y },       // Move to vertical routing channel
		{ x: verticalX, y: verticalEndY },  // Go vertical to target row/above
		entryPoint,                         // Approach target (horizontal for right, from above for left)
		end                                 // Entry point on target
	];

	// Compress path (remove redundant points on straight lines)
	const compressed = compressPath(path);

	return {
		path: compressed,
		method: exitRight ? 'Z-route' : 'Z-route-L',
		failed: false // Crossings are handled by hop arcs, not failures
	};
}

/**
 * Find the X position for the vertical segment of the path.
 *
 * Deterministic offset based on source link Y position:
 * - Links at TOP of card → riser further RIGHT
 * - Links at BOTTOM of card → riser further LEFT
 *
 * This naturally accommodates growing cards: as content is added at the bottom,
 * new links get their risers placed to the left of existing higher links.
 *
 * @param sourceY - Y position of the source link (determines offset)
 */
function findVerticalRoutingX(
	exitX: number,
	entryX: number,
	_minY: number,
	_maxY: number,
	_cards: Card[],
	sourceCard: Card,
	_targetCard: Card,
	_existingPaths: Point[][],
	sourceY?: number
): number {
	const gapWidth = entryX - exitX;
	const midX = exitX + gapWidth / 2;

	if (sourceY === undefined || gapWidth < 40) {
		return midX;
	}

	// Calculate offset based on source link position within the card
	// Top of card (normalizedY ≈ 0) → positive offset (right)
	// Bottom of card (normalizedY ≈ 1) → negative offset (left)
	const cardTop = sourceCard.position.y;
	const cardHeight = sourceCard.dimensions.height;
	const normalizedY = cardHeight > 0
		? (sourceY - cardTop) / cardHeight
		: 0.5;

	// Use up to 80% of gap width for offset range
	const maxOffset = gapWidth * 0.8;
	// Flip: top (0) → +maxOffset/2, bottom (1) → -maxOffset/2
	const offset = (0.5 - normalizedY) * maxOffset;

	const routingX = midX + offset;

	// Clamp to stay within gap bounds
	const minBound = exitX + 15;
	const maxBound = entryX - 15;
	return Math.max(minBound, Math.min(maxBound, routingX));
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

export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
	// Check for orthogonal segment intersection (vertical vs horizontal)
	// This handles cases the cross-product method misses (when segments touch at boundaries)
	const seg1Vertical = Math.abs(p2.x - p1.x) < 1;
	const seg1Horizontal = Math.abs(p2.y - p1.y) < 1;
	const seg2Vertical = Math.abs(p4.x - p3.x) < 1;
	const seg2Horizontal = Math.abs(p4.y - p3.y) < 1;

	if (seg1Vertical && seg2Horizontal) {
		// Segment 1 is vertical, segment 2 is horizontal
		const vx = p1.x;
		const minY = Math.min(p1.y, p2.y);
		const maxY = Math.max(p1.y, p2.y);
		const hy = p3.y;
		const minX = Math.min(p3.x, p4.x);
		const maxX = Math.max(p3.x, p4.x);

		// Strictly inside (not touching at boundaries)
		if (vx > minX && vx < maxX && hy > minY && hy < maxY) {
			return true;
		}
	} else if (seg1Horizontal && seg2Vertical) {
		// Segment 1 is horizontal, segment 2 is vertical
		const hy = p1.y;
		const minX = Math.min(p1.x, p2.x);
		const maxX = Math.max(p1.x, p2.x);
		const vx = p3.x;
		const minY = Math.min(p3.y, p4.y);
		const maxY = Math.max(p3.y, p4.y);

		// Strictly inside (not touching at boundaries)
		if (vx > minX && vx < maxX && hy > minY && hy < maxY) {
			return true;
		}
	}

	// Fall back to cross-product method for non-orthogonal segments
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

const HOP_RADIUS = 8;

/**
 * Find crossing points between a path segment and existing paths.
 * Uses the same segmentsIntersect logic as segmentsIntersect for consistency.
 */
function findCrossingsOnSegment(
	segStart: Point,
	segEnd: Point,
	existingPaths: Point[][]
): Point[] {
	const crossings: Point[] = [];

	for (const path of existingPaths) {
		for (let j = 0; j < path.length - 1; j++) {
			const otherStart = path[j];
			const otherEnd = path[j + 1];

			// Use same intersection check as segmentsIntersect
			if (segmentsIntersect(segStart, segEnd, otherStart, otherEnd)) {
				// Don't count shared endpoints as crossings
				if (sharesEndpoint(segStart, segEnd, otherStart, otherEnd)) {
					continue;
				}

				// Calculate exact crossing point
				const intersection = getIntersectionPoint(segStart, segEnd, otherStart, otherEnd);
				if (intersection) {
					crossings.push(intersection);
				}
			}
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

	// Deduplicate crossings that are too close (within 2 * HOP_RADIUS)
	const deduped: Point[] = [];
	for (const crossing of crossings) {
		const tooClose = deduped.some(existing => {
			const dist = Math.abs(dx) > Math.abs(dy)
				? Math.abs(crossing.x - existing.x)
				: Math.abs(crossing.y - existing.y);
			return dist < HOP_RADIUS * 2;
		});
		if (!tooClose) {
			deduped.push(crossing);
		}
	}

	return deduped;
}

/**
 * Calculate the intersection point of two line segments.
 */
export function getIntersectionPoint(
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
					const segmentY = prev.y; // Use segment's Y for consistency
					const hopStart = goingRight ? crossing.x - HOP_RADIUS : crossing.x + HOP_RADIUS;
					const hopEnd = goingRight ? crossing.x + HOP_RADIUS : crossing.x - HOP_RADIUS;

					// Draw to just before crossing
					if (goingRight ? hopStart > lastPos + 1 : hopStart < lastPos - 1) {
						d += ` H ${hopStart}`;
					}
					// Arc over the crossing (semicircle curving upward - away from page)
					// In SVG, Y increases downward, so "upward" = smaller Y
					// sweep-flag: 0 for counter-clockwise (going right, curves up), 1 for clockwise (going left, curves up)
					const arcCmd = ` A ${HOP_RADIUS} ${HOP_RADIUS} 0 0 ${goingRight ? 0 : 1} ${hopEnd} ${segmentY}`;
					d += arcCmd;
					lastPos = hopEnd;
				} else if (isVertical) {
					const segmentX = prev.x; // Use segment's X for consistency
					const hopStart = goingDown ? crossing.y - HOP_RADIUS : crossing.y + HOP_RADIUS;
					const hopEnd = goingDown ? crossing.y + HOP_RADIUS : crossing.y - HOP_RADIUS;

					// Draw to just before crossing
					if (goingDown ? hopStart > lastPos + 1 : hopStart < lastPos - 1) {
						d += ` V ${hopStart}`;
					}
					// Arc over the crossing (semicircle curving to the right)
					// sweep-flag: 1 for clockwise (going down, curves right), 0 for counter-clockwise (going up, curves right)
					d += ` A ${HOP_RADIUS} ${HOP_RADIUS} 0 0 ${goingDown ? 1 : 0} ${segmentX} ${hopEnd}`;
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
 * Calculate entry point on a card - at left edge, heading level.
 * Both left-going and right-going connections enter from the left edge.
 */
export function getCardEntryPoint(card: Card, fromPoint: Point): Point {
	return {
		x: card.position.x - 8,
		y: card.position.y + 20 // Heading level
	};
}
