import type { Card, Point, Dimensions, LinkSide } from '$lib/types';
import { CARD_SPACING, DEFAULT_CARD_WIDTH } from '$lib/types';
import {
	detectCoaxialOverlap,
	findUsedVerticalChannels,
	simulatePath
} from './pathfinding';

/**
 * Card placement with multi-candidate scoring to avoid coaxial line overlap.
 *
 * Design principles:
 * 1. Generate multiple candidate positions (different columns, Y offsets)
 * 2. Score each candidate based on coaxial overlap, crossings, distance
 * 3. Pick the candidate with the lowest score
 * 4. Assign unique routing channels to avoid shared vertical segments
 */

const ROUTING_GAP = 80; // Horizontal gap between columns for routing vertical segments
const COLUMN_WIDTH = DEFAULT_CARD_WIDTH + CARD_SPACING + ROUTING_GAP;
const CHANNEL_STEP = 15; // Spacing between routing channels

// Scoring constants for layout algorithm
const SCORING = {
	// Column preferences - right side is always preferred
	RIGHT_SIDE_BONUS: 0,        // No penalty for right side
	LEFT_SIDE_PENALTY: 150,     // Penalty for left side (even if link is on left)
	COLUMN_FAR_PENALTY: 100,    // Additional penalty per column distance > 1
	Y_DISTANCE_WEIGHT: 0.5,
	// Line routing penalties
	CHANNEL_REUSE_PENALTY: 500,
	COAXIAL_PENALTY_PER_SEGMENT: 2000,  // Very heavy penalty for lines running alongside
	COAXIAL_PENALTY_PER_PIXEL: 10,      // Scale strongly with overlap length
	CROSSING_PENALTY: 200,
	CARD_OVERLAP_PENALTY: 1000
} as const;

/**
 * Layout candidate for scoring.
 */
interface LayoutCandidate {
	position: Point;
	column: number;
	routingX: number;
	score: number;
}

/**
 * Calculate position for a new card using multi-candidate scoring.
 */
export function calculateNewCardPosition(
	parentCard: Card | null,
	existingCards: Card[],
	linkPosition: Point | null,
	newCardDimensions: Dimensions,
	existingPaths: Point[][] = [],
	linkSide?: LinkSide
): { position: Point; routingX?: number } {
	if (!parentCard || !linkPosition) {
		return { position: { x: 0, y: 0 } };
	}

	// Generate all candidates
	const candidates = generateCandidates(
		parentCard,
		linkPosition,
		newCardDimensions,
		existingCards,
		existingPaths
	);

	// Score each candidate
	for (const candidate of candidates) {
		candidate.score = scoreCandidatePosition(
			candidate,
			parentCard,
			linkPosition,
			newCardDimensions,
			existingCards,
			existingPaths,
			linkSide
		);
	}

	// Sort by score (lower is better) and pick the best
	candidates.sort((a, b) => a.score - b.score);

	const best = candidates[0];
	if (best && best.score < Infinity) {
		return {
			position: best.position,
			routingX: best.routingX
		};
	}

	// Fallback if no valid candidates
	const parentColumn = Math.floor(parentCard.position.x / COLUMN_WIDTH);
	const fallbackX = (parentColumn + 1) * COLUMN_WIDTH;
	const fallbackY = Math.max(0, linkPosition.y - 20);

	return { position: { x: fallbackX, y: fallbackY } };
}

/**
 * Generate candidate positions across multiple columns and Y offsets.
 */
function generateCandidates(
	parentCard: Card,
	linkPosition: Point,
	newCardDimensions: Dimensions,
	existingCards: Card[],
	existingPaths: Point[][]
): LayoutCandidate[] {
	const candidates: LayoutCandidate[] = [];

	const parentColumn = Math.floor(parentCard.position.x / COLUMN_WIDTH);
	const baseY = linkPosition.y - 20; // Align heading with link

	// Generate Y offsets based on card heights
	const maxCardHeight = Math.max(
		newCardDimensions.height,
		...existingCards.map(c => c.dimensions.height)
	);
	const maxOffset = Math.max(600, maxCardHeight + 200);

	const yOffsets: number[] = [0];
	for (let offset = 60; offset <= maxOffset; offset += 60) {
		yOffsets.push(-offset, offset);
	}

	// Columns to try: N+1, N+2, N+3 (right), and N-1, N-2 (left)
	// Allow negative columns for left-side placement from root card
	const columnsToTry = [
		parentColumn + 1,
		parentColumn + 2,
		parentColumn - 1,  // Left side
		parentColumn - 2,  // Further left
		parentColumn + 3
	];

	for (const targetColumn of columnsToTry) {
		const targetX = targetColumn * COLUMN_WIDTH;
		const isLeftSide = targetColumn < parentColumn;

		// Calculate routing gap bounds
		let gapStart: number, gapEnd: number;
		if (isLeftSide) {
			gapStart = targetX + newCardDimensions.width + 10;
			gapEnd = parentCard.position.x - 10;
		} else {
			gapStart = parentCard.position.x + parentCard.dimensions.width + 10;
			gapEnd = targetX - 10;
		}

		// Find available routing channels in this gap
		const usedChannels = findUsedVerticalChannels(existingPaths, gapStart, gapEnd);
		const availableChannels = findAvailableChannels(gapStart, gapEnd, usedChannels);

		for (const yOffset of yOffsets) {
			const candidateY = Math.max(0, baseY + yOffset);
			const candidatePos = { x: targetX, y: candidateY };

			// Skip if overlaps with existing cards
			if (hasOverlap(candidatePos, newCardDimensions, existingCards)) {
				continue;
			}

			// Create candidates with different routing channels
			for (const routingX of availableChannels.slice(0, 3)) {
				candidates.push({
					position: candidatePos,
					column: targetColumn,
					routingX,
					score: Infinity
				});
			}

			// Also add default midpoint routing
			const midX = (gapStart + gapEnd) / 2;
			if (!availableChannels.includes(midX)) {
				candidates.push({
					position: candidatePos,
					column: targetColumn,
					routingX: midX,
					score: Infinity
				});
			}
		}
	}

	return candidates;
}

/**
 * Find available routing channels in a gap.
 */
function findAvailableChannels(
	gapStart: number,
	gapEnd: number,
	usedChannels: number[]
): number[] {
	const available: number[] = [];
	const gapWidth = gapEnd - gapStart;

	if (gapWidth < CHANNEL_STEP * 2) {
		// Gap too narrow - just use midpoint
		return [(gapStart + gapEnd) / 2];
	}

	const midX = (gapStart + gapEnd) / 2;

	// Try positions from middle outward
	for (let offset = 0; offset < gapWidth / 2; offset += CHANNEL_STEP) {
		const positions = offset === 0 ? [midX] : [midX + offset, midX - offset];

		for (const x of positions) {
			if (x > gapStart + 5 && x < gapEnd - 5) {
				// Check if this channel is available
				const isUsed = usedChannels.some(c => Math.abs(c - x) < CHANNEL_STEP);
				if (!isUsed) {
					available.push(x);
				}
			}
		}
	}

	// If nothing available, return midpoint
	if (available.length === 0) {
		available.push(midX);
	}

	return available;
}

/**
 * Score a candidate position. Lower is better.
 */
function scoreCandidatePosition(
	candidate: LayoutCandidate,
	parentCard: Card,
	linkPosition: Point,
	newCardDimensions: Dimensions,
	existingCards: Card[],
	existingPaths: Point[][],
	linkSide?: LinkSide
): number {
	let score = 0;

	const parentColumn = Math.floor(parentCard.position.x / COLUMN_WIDTH);

	// 1. Simulate the path for this candidate
	const simPath = simulatePath(
		linkPosition,
		candidate.position,
		parentCard,
		newCardDimensions,
		candidate.routingX
	);

	// 2. Coaxial overlap penalty (most important)
	const coaxial = detectCoaxialOverlap(simPath, existingPaths);
	score += coaxial.count * SCORING.COAXIAL_PENALTY_PER_SEGMENT;
	score += coaxial.totalLength * SCORING.COAXIAL_PENALTY_PER_PIXEL;

	// 3. Path crossing penalty (perpendicular crossings are ok but not ideal)
	const crossings = countPathCrossings(simPath, existingPaths);
	score += crossings * SCORING.CROSSING_PENALTY;

	// 4. Path crosses card penalty
	if (pathCrossesCards(simPath, existingCards, parentCard)) {
		score += SCORING.CARD_OVERLAP_PENALTY;
	}

	// 5. Distance from ideal Y position (prefer close to link)
	const idealY = linkPosition.y - 20;
	const yDistance = Math.abs(candidate.position.y - idealY);
	score += yDistance * SCORING.Y_DISTANCE_WEIGHT;

	// 6. Column preference - right side always preferred, left as fallback
	const isRightSide = candidate.column > parentColumn;
	const columnDistance = Math.abs(candidate.column - parentColumn);

	if (isRightSide) {
		// Right side: no base penalty, small penalty for distance
		score += SCORING.RIGHT_SIDE_BONUS;
		if (columnDistance > 1) {
			score += (columnDistance - 1) * SCORING.COLUMN_FAR_PENALTY;
		}
	} else {
		// Left side: base penalty plus distance penalty
		score += SCORING.LEFT_SIDE_PENALTY;
		if (columnDistance > 1) {
			score += (columnDistance - 1) * SCORING.COLUMN_FAR_PENALTY;
		}
	}

	// 7. Prefer unused routing channels (bonus for unique channel)
	const usedChannels = findUsedVerticalChannels(
		existingPaths,
		Math.min(parentCard.position.x, candidate.position.x),
		Math.max(parentCard.position.x + parentCard.dimensions.width, candidate.position.x + newCardDimensions.width)
	);
	const channelUsed = usedChannels.some(c => Math.abs(c - candidate.routingX) < CHANNEL_STEP);
	if (channelUsed) {
		score += SCORING.CHANNEL_REUSE_PENALTY;
	}

	return score;
}

/**
 * Count perpendicular crossings between a path and existing paths.
 */
function countPathCrossings(path: Point[], existingPaths: Point[][]): number {
	let count = 0;

	for (let i = 0; i < path.length - 1; i++) {
		const seg1Start = path[i];
		const seg1End = path[i + 1];

		for (const existingPath of existingPaths) {
			for (let j = 0; j < existingPath.length - 1; j++) {
				const seg2Start = existingPath[j];
				const seg2End = existingPath[j + 1];

				if (segmentsIntersect(seg1Start, seg1End, seg2Start, seg2End)) {
					// Check it's not at a shared endpoint
					if (!sharesEndpoint(seg1Start, seg1End, seg2Start, seg2End)) {
						count++;
					}
				}
			}
		}
	}

	return count;
}

/**
 * Check if a path crosses any cards (except source).
 */
function pathCrossesCards(path: Point[], cards: Card[], sourceCard: Card): boolean {
	const padding = 15;

	for (let i = 0; i < path.length - 1; i++) {
		const segStart = path[i];
		const segEnd = path[i + 1];

		const minX = Math.min(segStart.x, segEnd.x);
		const maxX = Math.max(segStart.x, segEnd.x);
		const minY = Math.min(segStart.y, segEnd.y);
		const maxY = Math.max(segStart.y, segEnd.y);

		for (const card of cards) {
			if (card.id === sourceCard.id) continue;

			const cardLeft = card.position.x - padding;
			const cardRight = card.position.x + card.dimensions.width + padding;
			const cardTop = card.position.y - padding;
			const cardBottom = card.position.y + card.dimensions.height + padding;

			// Check if segment box overlaps card box
			if (maxX >= cardLeft && minX <= cardRight &&
				maxY >= cardTop && minY <= cardBottom) {
				// More precise check for line-rect intersection
				if (lineIntersectsRect(segStart, segEnd, cardLeft, cardTop, cardRight, cardBottom)) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Check if a line segment intersects a rectangle.
 */
function lineIntersectsRect(
	p1: Point, p2: Point,
	left: number, top: number, right: number, bottom: number
): boolean {
	// Check if line crosses any of the four edges
	return (
		segmentsIntersect(p1, p2, { x: left, y: top }, { x: right, y: top }) ||
		segmentsIntersect(p1, p2, { x: right, y: top }, { x: right, y: bottom }) ||
		segmentsIntersect(p1, p2, { x: left, y: bottom }, { x: right, y: bottom }) ||
		segmentsIntersect(p1, p2, { x: left, y: top }, { x: left, y: bottom })
	);
}

function sharesEndpoint(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
	return (
		pointsClose(p1, p3) || pointsClose(p1, p4) ||
		pointsClose(p2, p3) || pointsClose(p2, p4)
	);
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
