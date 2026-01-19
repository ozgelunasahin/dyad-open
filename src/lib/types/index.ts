import type { JSONContent } from '@tiptap/core';

export interface Point {
	x: number;
	y: number;
}

export interface Note {
	id: string; // The slug (human-readable identifier)
	canvasId: string; // Canvas this note belongs to
	title: string;
	content: JSONContent; // ProseMirror document JSON
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

/**
 * Active reading area margins (in pixels).
 * Defines the zone within the viewport where content should be for comfortable reading.
 * Asymmetric to match left-biased reading patterns (80% attention on left side).
 */
export interface ActiveArea {
	top: number;    // pixels from viewport top
	bottom: number; // pixels from viewport bottom
	left: number;   // pixels from viewport left
	right: number;  // pixels from viewport right
}

/**
 * Active reading area margins as percentages of viewport.
 * Based on UX research: readers focus 80% on left half of screen.
 */
export const ACTIVE_AREA_MARGINS = {
	top: 0.15,    // 15% - reading starts near top
	bottom: 0.10, // 10% - less space needed below
	left: 0.05,   // 5% - minimal, keep content near left where attention goes
	right: 0.20   // 20% - larger, users don't focus here; room for child cards
};

export interface NavigationHistory {
	back: string[][];
	forward: string[][];
}

export interface Vault {
	notes: Record<string, Note>;
	entryPoint: string;
}

// Card sizing - fixed column width for visual consistency
export const CARD_WIDTH = 440;
export const CARD_SPACING = 100;
export const CARD_SPACING_VERTICAL = 40;
export const MAX_CARDS = 50;

// Pathfinding grid
export const GRID_CELL_SIZE = 10;
export const OBSTACLE_PADDING = 20; // Keep small so paths can use gaps

// Layout types
export type LinkSide = 'left' | 'right';

