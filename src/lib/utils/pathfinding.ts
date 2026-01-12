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
	 * Uses same padding as buildGrid() to ensure complete clearing.
	 */
	clearRegion(card: Card): void {
		const left = Math.floor((card.position.x - OBSTACLE_PADDING - this.offsetX) / GRID_CELL_SIZE);
		const right = Math.ceil(
			(card.position.x + card.dimensions.width + OBSTACLE_PADDING - this.offsetX) / GRID_CELL_SIZE
		);
		const top = Math.floor((card.position.y - OBSTACLE_PADDING - this.offsetY) / GRID_CELL_SIZE);
		const bottom = Math.ceil(
			(card.position.y + card.dimensions.height + OBSTACLE_PADDING - this.offsetY) / GRID_CELL_SIZE
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
 * Tries multiple routing strategies to avoid obstacles.
 */
function createFallbackPath(start: Point, end: Point, grid?: PathfindingGrid): Point[] {
	const goingRight = end.x > start.x;
	const goingDown = end.y > start.y;

	// Strategy 1: Try going around via different waypoints
	const waypoints = [
		// Go horizontal first, then vertical
		{ x: end.x, y: start.y },
		// Go vertical first, then horizontal
		{ x: start.x, y: end.y },
		// Go around with offset
		{ x: goingRight ? end.x + 50 : end.x - 50, y: (start.y + end.y) / 2 },
		{ x: (start.x + end.x) / 2, y: goingDown ? end.y + 50 : end.y - 50 }
	];

	// If we have a grid, try to find a waypoint that's walkable
	if (grid) {
		for (const waypoint of waypoints) {
			const wpGrid = grid.toGridCoords(waypoint);
			if (grid.isWalkable(wpGrid.x, wpGrid.y)) {
				return compressPath([start, waypoint, end]);
			}
		}
	}

	// Last resort: simple L-route
	const midY = (start.y + end.y) / 2;
	if (goingRight) {
		return compressPath([
			start,
			{ x: end.x, y: start.y },
			end
		]);
	} else {
		return compressPath([
			start,
			{ x: start.x, y: midY },
			{ x: end.x, y: midY },
			end
		]);
	}
}

/**
 * Find path with initial horizontal segment (underline extension style).
 * Tries to route around obstacles, with flexible exit direction.
 */
export function findPathWithHorizontalExit(
	grid: PathfindingGrid,
	start: Point,
	end: Point
): Point[] {
	const exitDistance = 30;
	const goingRight = end.x > start.x;

	// Primary: Exit horizontally in direction of target
	const primaryExitX = goingRight ? start.x + exitDistance : start.x - exitDistance;
	const primaryExit = { x: primaryExitX, y: start.y };
	const primaryDir: Direction = goingRight ? 'right' : 'left';

	// Check if primary exit point is walkable
	const primaryGrid = grid.toGridCoords(primaryExit);
	if (grid.isWalkable(primaryGrid.x, primaryGrid.y)) {
		const mainPath = findOrthogonalPath(grid, primaryExit, end, primaryDir);
		if (mainPath.length > 0) {
			return [start, ...mainPath];
		}
	}

	// Fallback: Try exiting downward first
	const downExit = { x: start.x, y: start.y + exitDistance };
	const downGrid = grid.toGridCoords(downExit);
	if (grid.isWalkable(downGrid.x, downGrid.y)) {
		const mainPath = findOrthogonalPath(grid, downExit, end, 'down');
		if (mainPath.length > 0) {
			return [start, ...mainPath];
		}
	}

	// Fallback: Try exiting upward
	const upExit = { x: start.x, y: start.y - exitDistance };
	const upGrid = grid.toGridCoords(upExit);
	if (grid.isWalkable(upGrid.x, upGrid.y)) {
		const mainPath = findOrthogonalPath(grid, upExit, end, 'up');
		if (mainPath.length > 0) {
			return [start, ...mainPath];
		}
	}

	// Last resort: Direct A* from start to end
	const directPath = findOrthogonalPath(grid, start, end);
	if (directPath.length > 0) {
		return directPath;
	}

	// Ultimate fallback: Simple path ignoring obstacles
	return createFallbackPath(start, end, grid);
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
 * Determine if a segment is more vertical or horizontal.
 * Uses the actual delta to handle nearly-aligned points.
 */
function isVerticalSegment(from: Point, to: Point): boolean {
	const dx = Math.abs(to.x - from.x);
	const dy = Math.abs(to.y - from.y);
	return dy > dx;
}

/**
 * Align path points to make segments strictly orthogonal.
 * This prevents jagged corners from floating-point coordinate misalignment.
 */
function alignPathPoints(points: Point[]): Point[] {
	if (points.length < 2) return points;

	const aligned = [{ ...points[0] }];

	for (let i = 1; i < points.length; i++) {
		const prev = aligned[i - 1];
		const curr = { ...points[i] };

		// Determine if this segment should be vertical or horizontal
		if (isVerticalSegment(prev, curr)) {
			// Vertical segment - align X coordinates
			curr.x = prev.x;
		} else {
			// Horizontal segment - align Y coordinates
			curr.y = prev.y;
		}

		aligned.push(curr);
	}

	// Ensure the last point stays at its original position
	// and work backwards to fix alignment if needed
	const last = points[points.length - 1];
	aligned[aligned.length - 1] = { ...last };

	// Fix the second-to-last point to properly connect to the last point
	if (aligned.length >= 2) {
		const secondLast = aligned[aligned.length - 2];
		if (isVerticalSegment(secondLast, last)) {
			secondLast.x = last.x;
		} else {
			secondLast.y = last.y;
		}
	}

	return aligned;
}

/**
 * Generate SVG path string with rounded corners.
 * Aligns points to ensure clean orthogonal segments before rendering.
 */
export function pathToSvgWithRoundedCorners(points: Point[], cornerRadius: number = 8): string {
	if (points.length < 2) return '';

	if (points.length === 2) {
		return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
	}

	// Align points to make segments strictly orthogonal
	const aligned = alignPathPoints(points);

	let d = `M ${aligned[0].x} ${aligned[0].y}`;

	for (let i = 1; i < aligned.length - 1; i++) {
		const prev = aligned[i - 1];
		const curr = aligned[i];
		const next = aligned[i + 1];

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
		// Use aligned coordinates so equality checks work correctly
		let approachX: number, approachY: number;
		if (Math.abs(curr.x - prev.x) < 1) {
			// Vertical segment incoming
			approachX = curr.x;
			approachY = curr.y - Math.sign(curr.y - prev.y) * radius;
		} else {
			// Horizontal segment incoming
			approachX = curr.x - Math.sign(curr.x - prev.x) * radius;
			approachY = curr.y;
		}

		// Calculate departure point (after corner)
		let departX: number, departY: number;
		if (Math.abs(curr.x - next.x) < 1) {
			// Vertical segment outgoing
			departX = curr.x;
			departY = curr.y + Math.sign(next.y - curr.y) * radius;
		} else {
			// Horizontal segment outgoing
			departX = curr.x + Math.sign(next.x - curr.x) * radius;
			departY = curr.y;
		}

		// Draw line to approach, then quadratic curve
		d += ` L ${approachX} ${approachY}`;
		d += ` Q ${curr.x} ${curr.y} ${departX} ${departY}`;
	}

	// Line to final point
	d += ` L ${aligned[aligned.length - 1].x} ${aligned[aligned.length - 1].y}`;

	return d;
}

/**
 * Seeded random number generator for deterministic organic variation.
 * Uses a simple LCG algorithm.
 */
function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return (state / 0xffffffff) * 2 - 1; // Returns -1 to 1
	};
}

/**
 * Generate a simple numeric hash from a string (for connection IDs).
 */
function stringToSeed(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

/**
 * Catmull-Rom spline interpolation for smooth curves through control points.
 * Creates natural-looking curves that pass through all given points.
 */
function catmullRomSpline(points: Point[], tension: number = 0.5, segments: number = 8): Point[] {
	if (points.length < 2) return points;
	if (points.length === 2) return points;

	const result: Point[] = [];

	// Add phantom points at start and end for smooth endpoints
	const extended = [
		{ x: points[0].x * 2 - points[1].x, y: points[0].y * 2 - points[1].y },
		...points,
		{
			x: points[points.length - 1].x * 2 - points[points.length - 2].x,
			y: points[points.length - 1].y * 2 - points[points.length - 2].y
		}
	];

	// Interpolate between each pair of points
	for (let i = 1; i < extended.length - 2; i++) {
		const p0 = extended[i - 1];
		const p1 = extended[i];
		const p2 = extended[i + 1];
		const p3 = extended[i + 2];

		for (let t = 0; t < segments; t++) {
			const s = t / segments;
			const s2 = s * s;
			const s3 = s2 * s;

			// Catmull-Rom basis functions
			const h1 = -tension * s3 + 2 * tension * s2 - tension * s;
			const h2 = (2 - tension) * s3 + (tension - 3) * s2 + 1;
			const h3 = (tension - 2) * s3 + (3 - 2 * tension) * s2 + tension * s;
			const h4 = tension * s3 - tension * s2;

			result.push({
				x: h1 * p0.x + h2 * p1.x + h3 * p2.x + h4 * p3.x,
				y: h1 * p0.y + h2 * p1.y + h3 * p2.y + h4 * p3.y
			});
		}
	}

	// Add the final point
	result.push(points[points.length - 1]);

	return result;
}

/**
 * Add organic displacement to path points for hand-drawn feel.
 * Preserves start and end points exactly.
 */
function organicifyPath(points: Point[], seed: number, amplitude: number = 2): Point[] {
	if (points.length < 3) return points;

	const random = seededRandom(seed);
	const result: Point[] = [points[0]]; // Keep start point exact

	for (let i = 1; i < points.length - 1; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const next = points[i + 1];

		// Calculate perpendicular direction
		const dx = next.x - prev.x;
		const dy = next.y - prev.y;
		const len = Math.sqrt(dx * dx + dy * dy);

		if (len > 0) {
			// Perpendicular unit vector
			const perpX = -dy / len;
			const perpY = dx / len;

			// Random displacement perpendicular to path direction
			const displacement = random() * amplitude;

			result.push({
				x: curr.x + perpX * displacement,
				y: curr.y + perpY * displacement
			});
		} else {
			result.push(curr);
		}
	}

	result.push(points[points.length - 1]); // Keep end point exact
	return result;
}

/**
 * Generate SVG path with rounded corners at turns.
 * Uses simple rounded corners instead of splines to prevent overshooting.
 */
export function pathToOrganicSvg(points: Point[], connectionId: string): string {
	if (points.length < 2) return '';

	if (points.length === 2) {
		// For simple two-point paths, just draw a straight line
		return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
	}

	// Use rounded corners approach - larger radius for smoother curves
	return pathToSvgWithRoundedCorners(points, 20);
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
 * Calculate entry point on a card - targets the heading area (top of card).
 * The heading is approximately 20px from the top of the card.
 * Returns both the entry point and an approach point for horizontal entry.
 */
export function getCardEntryPoint(card: Card, fromPoint: Point): Point {
	// Heading Y position: card top + padding (8px) + half of h1 line-height (~12px)
	const headingY = card.position.y + 20;

	const cardCenter = {
		x: card.position.x + card.dimensions.width / 2,
		y: card.position.y + card.dimensions.height / 2
	};

	const dx = cardCenter.x - fromPoint.x;

	// Determine entry edge based on horizontal position
	if (dx > 0) {
		// Card is to the right - enter from left edge at heading height
		return {
			x: card.position.x,
			y: headingY
		};
	} else {
		// Card is to the left - enter from right edge at heading height
		return {
			x: card.position.x + card.dimensions.width,
			y: headingY
		};
	}
}

/**
 * Get approach point for horizontal entry - a point offset from entry to ensure horizontal final segment.
 */
export function getCardApproachPoint(card: Card, fromPoint: Point): Point {
	const entry = getCardEntryPoint(card, fromPoint);
	const approachDistance = 30;

	const cardCenter = {
		x: card.position.x + card.dimensions.width / 2,
		y: card.position.y + card.dimensions.height / 2
	};

	const dx = cardCenter.x - fromPoint.x;

	// Approach from the side horizontally
	if (dx > 0) {
		// Approaching from left
		return {
			x: entry.x - approachDistance,
			y: entry.y
		};
	} else {
		// Approaching from right
		return {
			x: entry.x + approachDistance,
			y: entry.y
		};
	}
}
