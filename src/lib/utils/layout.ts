import type { Card, Point } from '$lib/types';
import { CARD_WIDTH, CARD_HEIGHT, CARD_SPACING } from '$lib/types';

function normalizeVector(v: Point): Point {
	const mag = Math.sqrt(v.x * v.x + v.y * v.y);
	if (mag === 0) return { x: 1, y: 0 };
	return { x: v.x / mag, y: v.y / mag };
}

function hasOverlap(candidate: Point, cards: Card[]): boolean {
	const padding = CARD_SPACING / 2;
	return cards.some((card) => {
		const dx = Math.abs(candidate.x - card.position.x);
		const dy = Math.abs(candidate.y - card.position.y);
		return dx < CARD_WIDTH + padding && dy < CARD_HEIGHT + padding;
	});
}

export function calculateNewCardPosition(
	parentCard: Card | null,
	existingCards: Card[],
	linkPosition: Point | null
): Point {
	if (!parentCard) {
		return { x: 0, y: 0 };
	}

	const parentCenter = {
		x: parentCard.position.x + CARD_WIDTH / 2,
		y: parentCard.position.y + CARD_HEIGHT / 2
	};

	const direction = linkPosition
		? normalizeVector({
				x: linkPosition.x - parentCenter.x,
				y: linkPosition.y - parentCenter.y
			})
		: { x: 1, y: 0 };

	const baseDistance = CARD_WIDTH + CARD_SPACING;
	let distance = baseDistance;
	let angle = Math.atan2(direction.y, direction.x);
	let attempts = 0;

	while (attempts < 32) {
		const candidate = {
			x: parentCenter.x + Math.cos(angle) * distance - CARD_WIDTH / 2,
			y: parentCenter.y + Math.sin(angle) * distance - CARD_HEIGHT / 2
		};

		if (!hasOverlap(candidate, existingCards)) {
			return candidate;
		}

		angle += Math.PI / 8;
		if (attempts % 16 === 15) {
			distance += CARD_SPACING;
		}
		attempts++;
	}

	return {
		x: parentCard.position.x,
		y: parentCard.position.y + CARD_HEIGHT + CARD_SPACING
	};
}

export function getCardCenter(card: Card): Point {
	return {
		x: card.position.x + CARD_WIDTH / 2,
		y: card.position.y + CARD_HEIGHT / 2
	};
}

export function getConnectionPoints(
	fromCard: Card,
	toCard: Card,
	sourcePoint: Point | null
): { from: Point; to: Point } {
	const fromCenter = getCardCenter(fromCard);
	const toCenter = getCardCenter(toCard);

	const from = sourcePoint || fromCenter;

	const angle = Math.atan2(toCenter.y - from.y, toCenter.x - from.x);

	const to = {
		x: toCenter.x - Math.cos(angle) * (CARD_WIDTH / 2 + 10),
		y: toCenter.y - Math.sin(angle) * (CARD_HEIGHT / 2 + 10)
	};

	return { from, to };
}
