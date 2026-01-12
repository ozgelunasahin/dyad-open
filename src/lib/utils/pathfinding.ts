import type { Card, Point } from '$lib/types';
import { GRID_CELL_SIZE, OBSTACLE_PADDING } from '$lib/types';

type Direction = 'up' | 'down' | 'left' | 'right';

interface AStarNode {
	x: number;
	y: number;
	g: number;
	h: number;
	f: number;
	parent: AStarNode | null;
	direction: Direction | null;
}

const DIRECTIONS: { dx: number; dy: number; name: Direction }[] = [
	{ dx: 0, dy: -1, name: 'up' },
	{ dx: 1, dy: 0, name: 'right' },
	{ dx: 0, dy: 1, name: 'down' },
	{ dx: -1, dy: 0, name: 'left' }
];

// Penalty for changing direction (to minimize turns)
const TURN_PENALTY = 50;

/**
 * MinHeap for efficient A* priority queue operations.
 * O(log n) for push/pop instead of O(n log n) for array sort.
 */
class MinHeap<T> {
	private heap: T[] = [];
	private compareFn: (a: T, b: T) => number;

	constructor(compareFn: (a: T, b: T) => number) {
		this.compareFn = compareFn;
	}

	get length(): number {
		return this.heap.length;
	}

	push(item: T): void {
		this.heap.push(item);
		this.bubbleUp(this.heap.length - 1);
	}

	pop(): T | undefined {
		if (this.heap.length === 0) return undefined;
		const result = this.heap[0];
		const last = this.heap.pop()!;
		if (this.heap.length > 0) {
			this.heap[0] = last;
			this.bubbleDown(0);
		}
		return result;
	}

	find(predicate: (item: T) => boolean): T | undefined {
		return this.heap.find(predicate);
	}

	update(item: T): void {
		const idx = this.heap.indexOf(item);
		if (idx !== -1) {
			this.bubbleUp(idx);
			this.bubbleDown(idx);
		}
	}

	private bubbleUp(idx: number): void {
		while (idx > 0) {
			const parentIdx = Math.floor((idx - 1) / 2);
			if (this.compareFn(this.heap[idx], this.heap[parentIdx]) >= 0) break;
			[this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
			idx = parentIdx;
		}
	}

	private bubbleDown(idx: number): void {
		const length = this.heap.length;
		while (true) {
			const leftIdx = 2 * idx + 1;
			const rightIdx = 2 * idx + 2;
			let smallest = idx;

			if (leftIdx < length && this.compareFn(this.heap[leftIdx], this.heap[smallest]) < 0) {
				smallest = leftIdx;
			}
			if (rightIdx < length && this.compareFn(this.heap[rightIdx], this.heap[smallest]) < 0) {
				smallest = rightIdx;
			}
			if (smallest === idx) break;
			[this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
			idx = smallest;
		}
	}
}

/**
 * Grid-based pathfinding system for orthogonal routing.
 */
export class PathfindingGrid {
	private grid: boolean[][];
	private cols: number;
	private rows: number;
	private offsetX: number;
	private offsetY: number;

	constructor(cards: Card[], padding: number = OBSTACLE_PADDING) {
		// Calculate bounds from cards
		const bounds = this.calculateBounds(cards);

		// Add margin around bounds
		const margin = 200;
		this.offsetX = bounds.minX - margin;
		this.offsetY = bounds.minY - margin;

		const width = bounds.maxX - bounds.minX + margin * 2;
		const height = bounds.maxY - bounds.minY + margin * 2;

		this.cols = Math.ceil(width / GRID_CELL_SIZE);
		this.rows = Math.ceil(height / GRID_CELL_SIZE);

		this.grid = this.buildGrid(cards, padding);
	}

	/**
	 * Create a shallow clone for per-connection modifications.
	 */
	clone(): PathfindingGrid {
		const cloned = Object.create(PathfindingGrid.prototype);
		cloned.cols = this.cols;
		cloned.rows = this.rows;
		cloned.offsetX = this.offsetX;
		cloned.offsetY = this.offsetY;
		// Deep clone the grid
		cloned.grid = this.grid.map((row) => [...row]);
		return cloned;
	}

	private calculateBounds(cards: Card[]): {
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
	} {
		if (cards.length === 0) {
			return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
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

		return { minX, maxX, minY, maxY };
	}

	private buildGrid(cards: Card[], padding: number): boolean[][] {
		// Initialize all cells as walkable
		const grid = Array(this.rows)
			.fill(null)
			.map(() => Array(this.cols).fill(true));

		// Mark card regions as unwalkable
		for (const card of cards) {
			const left = Math.floor((card.position.x - padding - this.offsetX) / GRID_CELL_SIZE);
			const right = Math.ceil(
				(card.position.x + card.dimensions.width + padding - this.offsetX) / GRID_CELL_SIZE
			);
			const top = Math.floor((card.position.y - padding - this.offsetY) / GRID_CELL_SIZE);
			const bottom = Math.ceil(
				(card.position.y + card.dimensions.height + padding - this.offsetY) / GRID_CELL_SIZE
			);

			for (let row = top; row <= bottom; row++) {
				for (let col = left; col <= right; col++) {
					if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
						grid[row][col] = false;
					}
				}
			}
		}

		return grid;
	}

	isWalkable(gridX: number, gridY: number): boolean {
		if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) {
			return false;
		}
		return this.grid[gridY][gridX];
	}

	toGridCoords(canvasPoint: Point): Point {
		return {
			x: Math.floor((canvasPoint.x - this.offsetX) / GRID_CELL_SIZE),
			y: Math.floor((canvasPoint.y - this.offsetY) / GRID_CELL_SIZE)
		};
	}

	toCanvasCoords(gridPoint: Point): Point {
		return {
			x: gridPoint.x * GRID_CELL_SIZE + this.offsetX + GRID_CELL_SIZE / 2,
			y: gridPoint.y * GRID_CELL_SIZE + this.offsetY + GRID_CELL_SIZE / 2
		};
	}

	/**
	 * Temporarily mark a region as walkable (for source/target cards).
	 */
	clearRegion(card: Card): void {
		const left = Math.floor((card.position.x - this.offsetX) / GRID_CELL_SIZE);
		const right = Math.ceil(
			(card.position.x + card.dimensions.width - this.offsetX) / GRID_CELL_SIZE
		);
		const top = Math.floor((card.position.y - this.offsetY) / GRID_CELL_SIZE);
		const bottom = Math.ceil(
			(card.position.y + card.dimensions.height - this.offsetY) / GRID_CELL_SIZE
		);

		for (let row = top; row <= bottom; row++) {
			for (let col = left; col <= right; col++) {
				if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
					this.grid[row][col] = true;
				}
			}
		}
	}
}

/**
 * A* pathfinding with direction change penalty for orthogonal routing.
 * Uses MinHeap for O(log n) operations.
 */
export function findOrthogonalPath(
	grid: PathfindingGrid,
	start: Point,
	end: Point,
	initialDirection?: Direction
): Point[] {
	const startGrid = grid.toGridCoords(start);
	const endGrid = grid.toGridCoords(end);

	// If start or end is not walkable, try alternative fallbacks
	if (!grid.isWalkable(startGrid.x, startGrid.y) || !grid.isWalkable(endGrid.x, endGrid.y)) {
		return createFallbackPath(start, end);
	}

	const openSet = new MinHeap<AStarNode>((a, b) => a.f - b.f);
	const closedSet = new Map<string, AStarNode>();

	const startNode: AStarNode = {
		...startGrid,
		g: 0,
		h: manhattanDistance(startGrid, endGrid),
		f: manhattanDistance(startGrid, endGrid),
		parent: null,
		direction: initialDirection || null
	};

	openSet.push(startNode);

	let iterations = 0;
	const maxIterations = 5000;

	while (openSet.length > 0 && iterations < maxIterations) {
		iterations++;

		const current = openSet.pop()!;
		const currentKey = `${current.x},${current.y}`;

		if (current.x === endGrid.x && current.y === endGrid.y) {
			return reconstructPath(current, grid, start, end);
		}

		closedSet.set(currentKey, current);

		for (const dir of DIRECTIONS) {
			const nx = current.x + dir.dx;
			const ny = current.y + dir.dy;
			const neighborKey = `${nx},${ny}`;

			if (closedSet.has(neighborKey) || !grid.isWalkable(nx, ny)) {
				continue;
			}

			// Calculate cost with turn penalty
			let moveCost = 1;
			if (current.direction && current.direction !== dir.name) {
				moveCost += TURN_PENALTY;
			}

			const g = current.g + moveCost;
			const h = manhattanDistance({ x: nx, y: ny }, endGrid);

			const existingNode = openSet.find((n) => n.x === nx && n.y === ny);

			if (!existingNode) {
				openSet.push({
					x: nx,
					y: ny,
					g,
					h,
					f: g + h,
					parent: current,
					direction: dir.name
				});
			} else if (g < existingNode.g) {
				existingNode.g = g;
				existingNode.f = g + h;
				existingNode.parent = current;
				existingNode.direction = dir.name;
				openSet.update(existingNode);
			}
		}
	}

	// No path found - use fallback strategies
	return createFallbackPath(start, end);
}

/**
 * Create fallback paths when A* fails.
 * Lines start horizontally (as underline extension) then route to target.
 */
function createFallbackPath(start: Point, end: Point): Point[] {
	const exitDistance = 40; // Horizontal distance to extend as underline
	const goingRight = end.x > start.x;

	// Exit horizontally in the direction of the target (extending the underline)
	const exitX = goingRight ? start.x + exitDistance : start.x - exitDistance;

	// Simple L-route: horizontal first, then vertical
	if (goingRight) {
		// Target is to the right: extend underline right, then go to target
		return compressPath([
			start,
			{ x: exitX, y: start.y }, // Extend underline horizontally
			{ x: end.x, y: start.y }, // Continue horizontal to target x
			end
		]);
	} else {
		// Target is to the left: extend underline left, then route
		const midY = (start.y + end.y) / 2;
		return compressPath([
			start,
			{ x: exitX, y: start.y }, // Extend underline horizontally left
			{ x: exitX, y: midY }, // Go down/up
			{ x: end.x, y: midY }, // Horizontal to target x
			end
		]);
	}
}

/**
 * Find path with horizontal exit (line starts as underline extension).
 * Exits right if target is to the right, left if target is to the left.
 */
export function findPathWithHorizontalExit(
	grid: PathfindingGrid,
	start: Point,
	end: Point
): Point[] {
	const exitDistance = 30; // Horizontal distance to extend as underline
	const goingRight = end.x > start.x;

	// Exit horizontally in the direction of the target
	const exitX = goingRight ? start.x + exitDistance : start.x - exitDistance;
	const exitPoint = { x: exitX, y: start.y };
	const initialDir: Direction = goingRight ? 'right' : 'left';

	// Find path from exit point to end
	const mainPath = findOrthogonalPath(grid, exitPoint, end, initialDir);

	// Prepend the start->exit segment (the underline extension)
	if (mainPath.length > 0) {
		// Check if first point of mainPath is close to exitPoint
		const firstPoint = mainPath[0];
		if (Math.abs(firstPoint.x - exitPoint.x) < 5 && Math.abs(firstPoint.y - exitPoint.y) < 5) {
			return [start, ...mainPath];
		}
	}

	return [start, exitPoint, ...mainPath];
}

function manhattanDistance(a: Point, b: Point): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(
	node: AStarNode,
	grid: PathfindingGrid,
	start: Point,
	end: Point
): Point[] {
	const gridPath: Point[] = [];
	let current: AStarNode | null = node;

	while (current) {
		gridPath.unshift({ x: current.x, y: current.y });
		current = current.parent;
	}

	// Convert grid coords to canvas coords
	const canvasPath = gridPath.map((p) => grid.toCanvasCoords(p));

	// Ensure start and end points are exact
	if (canvasPath.length > 0) {
		canvasPath[0] = start;
		canvasPath[canvasPath.length - 1] = end;
	}

	return compressPath(canvasPath);
}

/**
 * Remove intermediate points on straight lines.
 */
function compressPath(path: Point[]): Point[] {
	if (path.length < 3) return path;

	const compressed: Point[] = [path[0]];

	for (let i = 1; i < path.length - 1; i++) {
		const prev = compressed[compressed.length - 1];
		const curr = path[i];
		const next = path[i + 1];

		// Keep only corner points
		const dx1 = Math.sign(curr.x - prev.x);
		const dy1 = Math.sign(curr.y - prev.y);
		const dx2 = Math.sign(next.x - curr.x);
		const dy2 = Math.sign(next.y - curr.y);

		if (dx1 !== dx2 || dy1 !== dy2) {
			compressed.push(curr);
		}
	}

	compressed.push(path[path.length - 1]);
	return compressed;
}

/**
 * Generate SVG path string with rounded corners.
 */
export function pathToSvgWithRoundedCorners(points: Point[], cornerRadius: number = 8): string {
	if (points.length < 2) return '';

	if (points.length === 2) {
		return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
	}

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 1; i < points.length - 1; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const next = points[i + 1];

		// Calculate distances to adjacent points
		const distPrev = Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
		const distNext = Math.abs(next.x - curr.x) + Math.abs(next.y - curr.y);

		// Limit radius to half the shortest segment
		const radius = Math.min(cornerRadius, distPrev / 2, distNext / 2);

		if (radius <= 1) {
			d += ` L ${curr.x} ${curr.y}`;
			continue;
		}

		// Calculate approach point (before corner)
		let approachX: number, approachY: number;
		if (curr.x === prev.x) {
			approachX = curr.x;
			approachY = curr.y - Math.sign(curr.y - prev.y) * radius;
		} else {
			approachX = curr.x - Math.sign(curr.x - prev.x) * radius;
			approachY = curr.y;
		}

		// Calculate departure point (after corner)
		let departX: number, departY: number;
		if (curr.x === next.x) {
			departX = curr.x;
			departY = curr.y + Math.sign(next.y - curr.y) * radius;
		} else {
			departX = curr.x + Math.sign(next.x - curr.x) * radius;
			departY = curr.y;
		}

		// Draw line to approach, then quadratic curve
		d += ` L ${approachX} ${approachY}`;
		d += ` Q ${curr.x} ${curr.y} ${departX} ${departY}`;
	}

	// Line to final point
	d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

	return d;
}

/**
 * Determine initial direction from a card edge based on link position.
 */
export function getInitialDirection(card: Card, linkPoint: Point): Direction {
	// Determine which edge the link is closest to
	const toLeft = linkPoint.x - card.position.x;
	const toRight = card.position.x + card.dimensions.width - linkPoint.x;
	const toTop = linkPoint.y - card.position.y;
	const toBottom = card.position.y + card.dimensions.height - linkPoint.y;

	const min = Math.min(toLeft, toRight, toTop, toBottom);

	if (min === toBottom) return 'down';
	if (min === toTop) return 'up';
	if (min === toRight) return 'right';
	return 'left';
}

/**
 * Calculate entry point on a card edge closest to the source.
 */
export function getCardEntryPoint(card: Card, fromPoint: Point): Point {
	const cardCenter = {
		x: card.position.x + card.dimensions.width / 2,
		y: card.position.y + card.dimensions.height / 2
	};

	const dx = cardCenter.x - fromPoint.x;
	const dy = cardCenter.y - fromPoint.y;

	if (Math.abs(dx) > Math.abs(dy)) {
		// Enter from left or right
		return {
			x: dx > 0 ? card.position.x : card.position.x + card.dimensions.width,
			y: Math.max(
				card.position.y + 10,
				Math.min(card.position.y + card.dimensions.height - 10, fromPoint.y)
			)
		};
	} else {
		// Enter from top or bottom
		return {
			x: Math.max(
				card.position.x + 10,
				Math.min(card.position.x + card.dimensions.width - 10, fromPoint.x)
			),
			y: dy > 0 ? card.position.y : card.position.y + card.dimensions.height
		};
	}
}
