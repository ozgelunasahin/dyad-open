export interface Point {
	x: number;
	y: number;
}

export interface Note {
	id: string;
	title: string;
	content: string;
	wikilinks: string[];
}

export interface Dimensions {
	width: number;
	height: number;
}

export interface Card {
	id: string;
	note: Note;
	position: Point;
	dimensions: Dimensions;
	parentId: string | null;
	sourceLink: Point | null;
}

export interface SourceBounds {
	left: number;
	right: number;
	y: number;
}

export interface Connection {
	fromCardId: string;
	toCardId: string;
	sourceBounds: SourceBounds;
	routingX?: number; // Pre-assigned routing channel X position
}

export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

export interface NavigationHistory {
	back: string[][];
	forward: string[][];
}

export interface Vault {
	notes: Record<string, Note>;
	entryPoint: string;
}

// Dynamic card sizing
export const MIN_CARD_WIDTH = 220;
export const MAX_CARD_WIDTH = 440;
export const DEFAULT_CARD_WIDTH = 320;
export const CARD_SPACING = 100;
export const CARD_SPACING_VERTICAL = 40;
export const MAX_CARDS = 50;

// Pathfinding grid
export const GRID_CELL_SIZE = 10;
export const OBSTACLE_PADDING = 20; // Keep small so paths can use gaps

// Layout types
export type LinkSide = 'left' | 'right';

// Debug visualization types
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface AStarExplorationFrame {
	iteration: number;
	currentNode: { x: number; y: number };
	openSet: Array<{ x: number; y: number; f: number }>;
	closedSet: Array<{ x: number; y: number }>;
	direction: Direction | null;
	turnPenaltyApplied: boolean;
}

export interface DebugGridCell {
	x: number;
	y: number;
	walkable: boolean;
}

// Pathfinding result types
export type PathMethod = 'heuristic-L' | 'heuristic-Z' | 'astar' | 'fallback';

export type PathResult =
	| { status: 'success'; path: Point[]; method: PathMethod }
	| { status: 'failed'; reason: 'blocked' | 'timeout' | 'impossible'; fallbackPath: Point[] };

export interface CrossingInfo {
	pathIndex1: number;
	pathIndex2: number;
	crossingPoint: Point;
	segment1: { start: Point; end: Point };
	segment2: { start: Point; end: Point };
}
