import type { Card, Point, Dimensions } from '$lib/types';
import { CARD_SPACING } from '$lib/types';

export type PlacementDirection = 'right' | 'below' | 'left';

interface PlacementResult {
	position: Point;
	direction: PlacementDirection;
}

/**
 * Calculate new card position with left-to-right flow.
 * Uses linkPosition to align cards vertically near the originating link.
 */
export function calculateNewCardPosition(
	parentCard: Card | null,
	existingCards: Card[],
	linkPosition: Point | null,
	newCardDimensions: Dimensions
): PlacementResult {
	if (!parentCard) {
		return { position: { x: 0, y: 0 }, direction: 'right' };
	}

	// Primary: Place to the right, vertically aligned near the link
	const rightPosition = {
		x: parentCard.position.x + parentCard.dimensions.width + CARD_SPACING,
		y: linkPosition
			? Math.max(0, linkPosition.y - 30) // Align card top near link position
			: parentCard.position.y
	};

	if (!hasOverlap(rightPosition, newCardDimensions, existingCards)) {
		return { position: rightPosition, direction: 'right' };
	}

	// Try right with vertical offset variations
	const rightAlternatives = tryRightAlternatives(
		parentCard,
		linkPosition,
		newCardDimensions,
		existingCards
	);
	if (rightAlternatives) {
		return { position: rightAlternatives, direction: 'right' };
	}

	// Secondary: Below the lowest existing card (footnote style)
	const lowestPoint = findLowestPoint(existingCards);
	const belowPosition = {
		x: linkPosition ? linkPosition.x - newCardDimensions.width / 2 : parentCard.position.x,
		y: lowestPoint + CARD_SPACING
	};

	// Clamp x to prevent going off-screen left
	belowPosition.x = Math.max(0, belowPosition.x);

	if (!hasOverlap(belowPosition, newCardDimensions, existingCards)) {
		return { position: belowPosition, direction: 'below' };
	}

	// Fallback: Find any available space scanning rightward
	return {
		position: findAvailableSpaceToRight(parentCard, existingCards, newCardDimensions),
		direction: 'right'
	};
}

/**
 * Try alternative positions to the right with vertical offsets.
 */
function tryRightAlternatives(
	parent: Card,
	linkPosition: Point | null,
	dimensions: Dimensions,
	existingCards: Card[]
): Point | null {
	const baseX = parent.position.x + parent.dimensions.width + CARD_SPACING;
	const baseY = linkPosition ? linkPosition.y - 30 : parent.position.y;

	// Try different vertical offsets
	const verticalOffsets = [0, 50, 100, -50, 150, -100, 200];

	for (const offset of verticalOffsets) {
		const candidate = {
			x: baseX,
			y: Math.max(0, baseY + offset)
		};

		if (!hasOverlap(candidate, dimensions, existingCards)) {
			return candidate;
		}
	}

	// Try further right if blocked
	const farRightX = findRightmostEdge(existingCards) + CARD_SPACING;
	const farRightPos = {
		x: farRightX,
		y: baseY
	};

	if (!hasOverlap(farRightPos, dimensions, existingCards)) {
		return farRightPos;
	}

	return null;
}

/**
 * Find the lowest point (bottom edge) of all existing cards.
 */
function findLowestPoint(cards: Card[]): number {
	if (cards.length === 0) return 0;

	return Math.max(...cards.map((card) => card.position.y + card.dimensions.height));
}

/**
 * Find the rightmost edge of all existing cards.
 */
function findRightmostEdge(cards: Card[]): number {
	if (cards.length === 0) return 0;

	return Math.max(...cards.map((card) => card.position.x + card.dimensions.width));
}

/**
 * Find available space by scanning rightward and downward.
 */
function findAvailableSpaceToRight(
	parent: Card,
	existingCards: Card[],
	dimensions: Dimensions
): Point {
	const rightEdge = findRightmostEdge(existingCards);
	const startX = rightEdge + CARD_SPACING;

	// Try positions in a grid pattern to the right
	for (let xOffset = 0; xOffset < 3; xOffset++) {
		for (let yOffset = 0; yOffset < 5; yOffset++) {
			const candidate = {
				x: startX + xOffset * (dimensions.width + CARD_SPACING),
				y: parent.position.y + yOffset * (100 + CARD_SPACING)
			};

			if (!hasOverlap(candidate, dimensions, existingCards)) {
				return candidate;
			}
		}
	}

	// Ultimate fallback: far to the right
	return {
		x: rightEdge + CARD_SPACING * 2,
		y: parent.position.y
	};
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

/**
 * Get the center point of a card.
 */
export function getCardCenter(card: Card): Point {
	return {
		x: card.position.x + card.dimensions.width / 2,
		y: card.position.y + card.dimensions.height / 2
	};
}
