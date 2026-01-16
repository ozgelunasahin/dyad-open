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
