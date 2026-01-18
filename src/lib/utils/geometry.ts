import type { Point, Card } from '$lib/types';

/** Get center point of a card */
export function cardCenter(card: Card): Point {
	return {
		x: card.position.x + card.dimensions.width / 2,
		y: card.position.y + card.dimensions.height / 2
	};
}

/** Get bounding box of a card */
export function cardBounds(card: Card) {
	return {
		left: card.position.x,
		right: card.position.x + card.dimensions.width,
		top: card.position.y,
		bottom: card.position.y + card.dimensions.height
	};
}

/** Check if segment is horizontal (within tolerance) */
export function isHorizontalSegment(start: Point, end: Point, tolerance = 1): boolean {
	return Math.abs(end.y - start.y) < tolerance;
}

/** Check if segment is vertical (within tolerance) */
export function isVerticalSegment(start: Point, end: Point, tolerance = 1): boolean {
	return Math.abs(end.x - start.x) < tolerance;
}

/** Default tolerance for point comparison */
export const POINT_TOLERANCE = 3;

/** Check if two points are close within tolerance */
export function pointsClose(a: Point, b: Point, tolerance = POINT_TOLERANCE): boolean {
	return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance;
}

/** Check if two segments share an endpoint */
export function sharesEndpoint(p1: Point, p2: Point, p3: Point, p4: Point, tolerance = POINT_TOLERANCE): boolean {
	return (
		pointsClose(p1, p3, tolerance) || pointsClose(p1, p4, tolerance) ||
		pointsClose(p2, p3, tolerance) || pointsClose(p2, p4, tolerance)
	);
}

/** Cross-product direction for intersection detection */
export function direction(p1: Point, p2: Point, p3: Point): number {
	return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

/** Check if two line segments intersect (handles orthogonal segments specially) */
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
