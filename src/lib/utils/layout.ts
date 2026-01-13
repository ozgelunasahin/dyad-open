import type { Card, Point, Dimensions } from '$lib/types';
import { CARD_SPACING, DEFAULT_CARD_WIDTH } from '$lib/types';

/**
 * Card placement with column-based newspaper/broadsheet layout.
 *
 * Design principles:
 * 1. Cards align on a virtual column grid (left edge to left edge)
 * 2. New cards placed in the next column to the right of parent
 * 3. Y position aligns with link position for horizontal exit
 * 4. Routing gaps between columns for orthogonal line paths
 * 5. Positions are immutable once placed (pen-and-paper model)
 */

const ROUTING_GAP = 60; // Horizontal gap between columns for routing vertical segments
const COLUMN_WIDTH = DEFAULT_CARD_WIDTH + CARD_SPACING + ROUTING_GAP; // ~480px per column

/**
 * Calculate position for a new card.
 * Aligns the new card's heading with the source link Y position.
 * Places cards in columns to the right with proper grid alignment.
 */
export function calculateNewCardPosition(
	parentCard: Card | null,
	existingCards: Card[],
	linkPosition: Point | null,
	newCardDimensions: Dimensions,
	existingPaths: Point[][] = []
): { position: Point } {
	if (!parentCard || !linkPosition) {
		return { position: { x: 0, y: 0 } };
	}

	// Target Y: align new card's heading (top + 20px) with the link Y
	// So card top = linkY - 20
	const headingOffset = 20;
	const baseY = linkPosition.y - headingOffset;

	// Determine target column based on parent's column
	// Column 0 starts at x=0, Column 1 at x=COLUMN_WIDTH, etc.
	const parentColumn = Math.floor(parentCard.position.x / COLUMN_WIDTH);
	const targetColumn = parentColumn + 1;

	// Target X aligns to column grid
	const targetX = targetColumn * COLUMN_WIDTH;

	// Generate Y offsets dynamically based on card heights
	// Include larger offsets to handle tall cards
	const maxCardHeight = Math.max(
		newCardDimensions.height,
		...existingCards.map(c => c.dimensions.height)
	);
	const maxOffset = Math.max(400, maxCardHeight + 100);

	const yOffsets: number[] = [0];
	for (let offset = 50; offset <= maxOffset; offset += 50) {
		yOffsets.push(-offset, offset);
	}

	for (const offset of yOffsets) {
		const candidateY = Math.max(0, baseY + offset);
		const candidate = { x: targetX, y: candidateY };

		// Check for overlap with existing cards
		if (!hasOverlap(candidate, newCardDimensions, existingCards)) {
			// Check if a clean path can be drawn
			const pathClear = canDrawCleanPath(
				linkPosition,
				candidate,
				newCardDimensions,
				parentCard,
				existingCards,
				existingPaths
			);

			if (pathClear) {
				return { position: candidate };
			}
		}
	}

	// Fallback: find any non-overlapping position with larger range
	for (const offset of yOffsets) {
		const candidateY = Math.max(0, baseY + offset);
		const candidate = { x: targetX, y: candidateY };

		if (!hasOverlap(candidate, newCardDimensions, existingCards)) {
			return { position: candidate };
		}
	}

	// Last resort: place in the next column further right
	const nextColumn = targetColumn + 1;
	const newColumnX = nextColumn * COLUMN_WIDTH;

	// Try to find non-overlapping position in the new column
	for (const offset of yOffsets) {
		const candidateY = Math.max(0, baseY + offset);
		const candidate = { x: newColumnX, y: candidateY };

		if (!hasOverlap(candidate, newCardDimensions, existingCards)) {
			return { position: candidate };
		}
	}

	// Ultimate fallback: continue trying columns to the right
	for (let col = nextColumn + 1; col <= nextColumn + 5; col++) {
		const colX = col * COLUMN_WIDTH;
		for (const offset of yOffsets) {
			const candidateY = Math.max(0, baseY + offset);
			const candidate = { x: colX, y: candidateY };

			if (!hasOverlap(candidate, newCardDimensions, existingCards)) {
				return { position: candidate };
			}
		}
	}

	// Final fallback
	return {
		position: {
			x: newColumnX,
			y: Math.max(0, baseY)
		}
	};
}

/**
 * Get all cards in the same column as the given card.
 * Cards are in the same column if they share the same column index.
 */
function getCardColumn(card: Card, allCards: Card[]): Card[] {
	const cardColumn = Math.floor(card.position.x / COLUMN_WIDTH);
	return allCards.filter(c => {
		const otherColumn = Math.floor(c.position.x / COLUMN_WIDTH);
		return otherColumn === cardColumn;
	});
}

/**
 * Check if a clean path can be drawn from source to target.
 * A clean path goes: horizontal exit → vertical in gap → horizontal entry
 */
function canDrawCleanPath(
	linkPosition: Point,
	targetPosition: Point,
	targetDimensions: Dimensions,
	sourceCard: Card,
	existingCards: Card[],
	existingPaths: Point[][]
): boolean {
	// Path structure:
	// 1. Exit source card horizontally (linkY)
	// 2. Go vertical in the gap between source and target columns
	// 3. Enter target card horizontally (at heading Y = targetPosition.y + 20)

	const sourceExitX = sourceCard.position.x + sourceCard.dimensions.width + 10;
	const targetEntryX = targetPosition.x - 10;
	const targetHeadingY = targetPosition.y + 20;

	// Vertical routing X is in the middle of the gap
	const verticalX = (sourceExitX + targetEntryX) / 2;

	// Check if vertical segment would cross any cards
	const minY = Math.min(linkPosition.y, targetHeadingY);
	const maxY = Math.max(linkPosition.y, targetHeadingY);

	for (const card of existingCards) {
		if (card.id === sourceCard.id) continue;

		// Check if vertical line at verticalX intersects this card
		const cardLeft = card.position.x - 20; // padding
		const cardRight = card.position.x + card.dimensions.width + 20;
		const cardTop = card.position.y - 20;
		const cardBottom = card.position.y + card.dimensions.height + 20;

		if (verticalX >= cardLeft && verticalX <= cardRight) {
			// X is within card bounds, check Y overlap
			if (maxY >= cardTop && minY <= cardBottom) {
				return false; // Path would cross this card
			}
		}
	}

	// Check if path would cross existing paths
	const newPath = [
		linkPosition,
		{ x: verticalX, y: linkPosition.y },
		{ x: verticalX, y: targetHeadingY },
		{ x: targetEntryX, y: targetHeadingY }
	];

	for (const existingPath of existingPaths) {
		if (pathsCross(newPath, existingPath)) {
			return false;
		}
	}

	return true;
}

/**
 * Check if two paths cross each other.
 */
function pathsCross(path1: Point[], path2: Point[]): boolean {
	for (let i = 0; i < path1.length - 1; i++) {
		for (let j = 0; j < path2.length - 1; j++) {
			if (segmentsIntersect(path1[i], path1[i + 1], path2[j], path2[j + 1])) {
				// Check if they share an endpoint (allowed)
				const shareEndpoint =
					pointsClose(path1[i], path2[j]) ||
					pointsClose(path1[i], path2[j + 1]) ||
					pointsClose(path1[i + 1], path2[j]) ||
					pointsClose(path1[i + 1], path2[j + 1]);

				if (!shareEndpoint) {
					return true;
				}
			}
		}
	}
	return false;
}

function pointsClose(a: Point, b: Point): boolean {
	return Math.abs(a.x - b.x) < 5 && Math.abs(a.y - b.y) < 5;
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
 * Check if a position overlaps with any existing cards.
 */
function hasOverlap(candidate: Point, dimensions: Dimensions, cards: Card[]): boolean {
	const padding = CARD_SPACING / 2;

	return cards.some((card) => {
		const dx = Math.abs(
			candidate.x + dimensions.width / 2 - (card.position.x + card.dimensions.width / 2)
		);
		const dy = Math.abs(
			candidate.y + dimensions.height / 2 - (card.position.y + card.dimensions.height / 2)
		);
		const overlapX = (dimensions.width + card.dimensions.width) / 2 + padding;
		const overlapY = (dimensions.height + card.dimensions.height) / 2 + padding;
		return dx < overlapX && dy < overlapY;
	});
}
