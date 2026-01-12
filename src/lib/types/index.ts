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

export interface Card {
	id: string;
	note: Note;
	position: Point;
	parentId: string | null;
	sourceLink: Point | null;
}

export interface Connection {
	fromCardId: string;
	toCardId: string;
	sourcePoint: Point;
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

export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 240;
export const CARD_SPACING = 80;
export const MAX_CARDS = 50;
