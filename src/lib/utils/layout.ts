import type { Card, Point, Dimensions } from '$lib/types';
import { CARD_SPACING } from '$lib/types';

export type PlacementDirection = 'right' | 'below' | 'left' | 'above';

interface PlacementResult {
	position: Point;
	direction: PlacementDirection;
}

interface BoundingBox {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	width: number;
	height: number;
	area: number;
}

interface ScoredCandidate {
	position: Point;
	direction: PlacementDirection;
	score: number;
}

/**
 * Calculate new card position optimizing for compact rectangular layout.
 * Considers positions in all directions and picks the one that minimizes bounding box expansion.
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

	// Get current bounding box
	const currentBounds = calculateBoundingBox(existingCards);

	// Generate all candidate positions
	const candidates = generateCandidates(
		parentCard,
		existingCards,
		linkPosition,
		newCardDimensions,
		currentBounds
	);

	// Filter out overlapping positions and score remaining ones
	const validCandidates: ScoredCandidate[] = [];

	for (const candidate of candidates) {
		if (!hasOverlap(candidate.position, newCardDimensions, existingCards)) {
			const score = scoreCandidate(
				candidate.position,
				newCardDimensions,
				existingCards,
				parentCard,
				currentBounds
			);
			validCandidates.push({ ...candidate, score });
		}
	}

	// Sort by score (lower is better) and return best
	if (validCandidates.length > 0) {
		validCandidates.sort((a, b) => a.score - b.score);
		return { position: validCandidates[0].position, direction: validCandidates[0].direction };
	}

	// Fallback: scan for any available space
	return {
		position: findAnyAvailableSpace(existingCards, newCardDimensions, currentBounds),
		direction: 'right'
	};
}

/**
 * Calculate bounding box of all cards.
 */
function calculateBoundingBox(cards: Card[]): BoundingBox {
	if (cards.length === 0) {
		return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, area: 0 };
	}

	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;

	for (const card of cards) {
		minX = Math.min(minX, card.position.x);
		maxX = Math.max(maxX, card.position.x + card.dimensions.width);
		minY = Math.min(minY, card.position.y);
		maxY = Math.max(maxY, card.position.y + card.dimensions.height);
	}

	const width = maxX - minX;
	const height = maxY - minY;

	return { minX, maxX, minY, maxY, width, height, area: width * height };
}

/**
 * Generate candidate positions in all directions.
 */
function generateCandidates(
	parentCard: Card,
	existingCards: Card[],
	linkPosition: Point | null,
	newCardDimensions: Dimensions,
	bounds: BoundingBox
): Array<{ position: Point; direction: PlacementDirection }> {
	const candidates: Array<{ position: Point; direction: PlacementDirection }> = [];
	const baseY = linkPosition ? linkPosition.y - 30 : parentCard.position.y;

	// RIGHT of parent (primary direction)
	const rightX = parentCard.position.x + parentCard.dimensions.width + CARD_SPACING;
	for (const yOffset of [0, -30, 30, -60, 60, -90, 90]) {
		candidates.push({
			position: { x: rightX, y: Math.max(0, baseY + yOffset) },
			direction: 'right'
		});
	}

	// LEFT of parent
	const leftX = parentCard.position.x - newCardDimensions.width - CARD_SPACING;
	if (leftX >= 0) {
		for (const yOffset of [0, -30, 30, -60, 60]) {
			candidates.push({
				position: { x: leftX, y: Math.max(0, baseY + yOffset) },
				direction: 'left'
			});
		}
	}

	// BELOW parent
	const belowY = parentCard.position.y + parentCard.dimensions.height + CARD_SPACING;
	for (const xOffset of [0, -50, 50, -100, 100]) {
		candidates.push({
			position: { x: Math.max(0, parentCard.position.x + xOffset), y: belowY },
			direction: 'below'
		});
	}

	// ABOVE parent
	const aboveY = parentCard.position.y - newCardDimensions.height - CARD_SPACING;
	if (aboveY >= 0) {
		for (const xOffset of [0, -50, 50]) {
			candidates.push({
				position: { x: Math.max(0, parentCard.position.x + xOffset), y: aboveY },
				direction: 'above'
			});
		}
	}

	// Along bounding box edges (for dense packing)
	if (existingCards.length > 1) {
		// Right edge of bounds
		candidates.push({
			position: { x: bounds.maxX + CARD_SPACING, y: bounds.minY },
			direction: 'right'
		});
		candidates.push({
			position: { x: bounds.maxX + CARD_SPACING, y: (bounds.minY + bounds.maxY) / 2 - newCardDimensions.height / 2 },
			direction: 'right'
		});

		// Left edge of bounds
		if (bounds.minX - newCardDimensions.width - CARD_SPACING >= 0) {
			candidates.push({
				position: { x: bounds.minX - newCardDimensions.width - CARD_SPACING, y: bounds.minY },
				direction: 'left'
			});
		}

		// Bottom edge of bounds
		candidates.push({
			position: { x: bounds.minX, y: bounds.maxY + CARD_SPACING },
			direction: 'below'
		});
		candidates.push({
			position: { x: (bounds.minX + bounds.maxX) / 2 - newCardDimensions.width / 2, y: bounds.maxY + CARD_SPACING },
			direction: 'below'
		});

		// Top edge of bounds
		if (bounds.minY - newCardDimensions.height - CARD_SPACING >= 0) {
			candidates.push({
				position: { x: bounds.minX, y: bounds.minY - newCardDimensions.height - CARD_SPACING },
				direction: 'above'
			});
		}
	}

	// Interior gap positions (scan for gaps between cards)
	const gapPositions = findInteriorGaps(existingCards, newCardDimensions, bounds);
	for (const gap of gapPositions) {
		candidates.push({ position: gap, direction: 'right' });
	}

	return candidates;
}

/**
 * Find gaps in the interior of the bounding box large enough for a new card.
 */
function findInteriorGaps(
	existingCards: Card[],
	newCardDimensions: Dimensions,
	bounds: BoundingBox
): Point[] {
	const gaps: Point[] = [];
	const step = 50; // Scan resolution

	for (let x = bounds.minX; x <= bounds.maxX - newCardDimensions.width; x += step) {
		for (let y = bounds.minY; y <= bounds.maxY - newCardDimensions.height; y += step) {
			const candidate = { x, y };
			if (!hasOverlap(candidate, newCardDimensions, existingCards)) {
				gaps.push(candidate);
			}
		}
	}

	return gaps;
}

/**
 * Score a candidate position. Lower score = better.
 * Strongly prefers horizontal (right) placement, then nearby positions.
 */
function scoreCandidate(
	position: Point,
	dimensions: Dimensions,
	existingCards: Card[],
	parentCard: Card,
	currentBounds: BoundingBox
): number {
	const parentRight = parentCard.position.x + parentCard.dimensions.width;
	const parentBottom = parentCard.position.y + parentCard.dimensions.height;

	// Direction-based scoring (primary factor)
	let directionScore = 0;

	if (position.x >= parentRight) {
		// RIGHT of parent - best! Score based on how aligned vertically
		const verticalOverlap = Math.min(
			position.y + dimensions.height,
			parentBottom
		) - Math.max(position.y, parentCard.position.y);
		directionScore = verticalOverlap > 0 ? 0 : 100; // Prefer overlapping rows
	} else if (position.y >= parentBottom) {
		// BELOW parent - okay, but penalize
		directionScore = 300;
	} else if (position.x + dimensions.width <= parentCard.position.x) {
		// LEFT of parent - acceptable
		directionScore = 200;
	} else {
		// ABOVE or overlapping - worst
		directionScore = 500;
	}

	// Distance from parent's right edge (for right placements) or bottom edge (for below)
	let proximityScore = 0;
	if (position.x >= parentRight) {
		// Horizontal distance from parent's right edge
		proximityScore = (position.x - parentRight) * 0.5;
		// Vertical alignment bonus - prefer same row
		const verticalDiff = Math.abs(position.y - parentCard.position.y);
		proximityScore += verticalDiff * 0.3;
	} else {
		// General distance for non-right placements
		const dx = position.x - parentCard.position.x;
		const dy = position.y - parentCard.position.y;
		proximityScore = Math.sqrt(dx * dx + dy * dy) * 0.5;
	}

	// Combine scores
	return directionScore + proximityScore;
}

/**
 * Find any available space when all candidates fail.
 */
function findAnyAvailableSpace(
	existingCards: Card[],
	dimensions: Dimensions,
	bounds: BoundingBox
): Point {
	// Scan around the perimeter of the bounding box
	const positions = [
		{ x: bounds.maxX + CARD_SPACING, y: bounds.minY },
		{ x: bounds.maxX + CARD_SPACING, y: bounds.maxY - dimensions.height },
		{ x: bounds.minX, y: bounds.maxY + CARD_SPACING },
		{ x: bounds.maxX - dimensions.width, y: bounds.maxY + CARD_SPACING },
	];

	for (const pos of positions) {
		if (!hasOverlap(pos, dimensions, existingCards)) {
			return pos;
		}
	}

	// Last resort: extend right
	return {
		x: bounds.maxX + CARD_SPACING * 2,
		y: bounds.minY
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
