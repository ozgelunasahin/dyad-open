import { describe, it, expect } from 'vitest';
import {
	segmentsIntersect,
	getIntersectionPoint,
	pathToSvg,
	pathToSvgWithHops,
	detectCoaxialOverlap,
	findUsedVerticalChannels,
	getCardEntryPoint
} from './pathfinding';
import type { Point, Card } from '$lib/types';

describe('segmentsIntersect', () => {
	it('detects perpendicular crossing segments', () => {
		// Horizontal segment from (0,5) to (10,5)
		// Vertical segment from (5,0) to (5,10)
		expect(segmentsIntersect(
			{ x: 0, y: 5 }, { x: 10, y: 5 },
			{ x: 5, y: 0 }, { x: 5, y: 10 }
		)).toBe(true);
	});

	it('returns false for parallel non-intersecting segments', () => {
		// Two horizontal parallel segments
		expect(segmentsIntersect(
			{ x: 0, y: 0 }, { x: 10, y: 0 },
			{ x: 0, y: 5 }, { x: 10, y: 5 }
		)).toBe(false);
	});

	it('returns false for segments that do not reach each other', () => {
		// Horizontal segment stops before vertical segment
		expect(segmentsIntersect(
			{ x: 0, y: 5 }, { x: 3, y: 5 },
			{ x: 5, y: 0 }, { x: 5, y: 10 }
		)).toBe(false);
	});

	it('returns false for collinear non-overlapping segments', () => {
		// Same line but don't overlap
		expect(segmentsIntersect(
			{ x: 0, y: 0 }, { x: 5, y: 0 },
			{ x: 10, y: 0 }, { x: 15, y: 0 }
		)).toBe(false);
	});

	it('detects X-shaped crossing', () => {
		// Diagonal crossing
		expect(segmentsIntersect(
			{ x: 0, y: 0 }, { x: 10, y: 10 },
			{ x: 0, y: 10 }, { x: 10, y: 0 }
		)).toBe(true);
	});
});

describe('getIntersectionPoint', () => {
	it('calculates correct intersection for perpendicular lines', () => {
		const result = getIntersectionPoint(
			{ x: 0, y: 5 }, { x: 10, y: 5 },
			{ x: 5, y: 0 }, { x: 5, y: 10 }
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(5);
		expect(result!.y).toBeCloseTo(5);
	});

	it('calculates correct intersection for diagonal lines', () => {
		const result = getIntersectionPoint(
			{ x: 0, y: 0 }, { x: 10, y: 10 },
			{ x: 0, y: 10 }, { x: 10, y: 0 }
		);
		expect(result).not.toBeNull();
		expect(result!.x).toBeCloseTo(5);
		expect(result!.y).toBeCloseTo(5);
	});

	it('returns null for parallel lines', () => {
		const result = getIntersectionPoint(
			{ x: 0, y: 0 }, { x: 10, y: 0 },
			{ x: 0, y: 5 }, { x: 10, y: 5 }
		);
		expect(result).toBeNull();
	});
});

describe('pathToSvg', () => {
	it('generates correct SVG for simple horizontal line', () => {
		const path = [{ x: 0, y: 10 }, { x: 100, y: 10 }];
		const svg = pathToSvg(path);
		expect(svg).toBe('M 0 10 H 100');
	});

	it('generates correct SVG for simple vertical line', () => {
		const path = [{ x: 10, y: 0 }, { x: 10, y: 100 }];
		const svg = pathToSvg(path);
		expect(svg).toBe('M 10 0 V 100');
	});

	it('generates correct SVG for L-shaped path', () => {
		const path = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 }
		];
		const svg = pathToSvg(path);
		expect(svg).toBe('M 0 0 H 100 V 100');
	});

	it('generates correct SVG for Z-shaped path', () => {
		const path = [
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
			{ x: 50, y: 100 },
			{ x: 100, y: 100 }
		];
		const svg = pathToSvg(path);
		expect(svg).toBe('M 0 0 H 50 V 100 H 100');
	});

	it('returns empty string for path with less than 2 points', () => {
		expect(pathToSvg([])).toBe('');
		expect(pathToSvg([{ x: 0, y: 0 }])).toBe('');
	});
});

describe('pathToSvgWithHops', () => {
	it('generates basic path when no crossings exist', () => {
		const path = [{ x: 0, y: 10 }, { x: 100, y: 10 }];
		const svg = pathToSvgWithHops(path, []);
		expect(svg).toBe('M 0 10 H 100');
	});

	it('generates arc for horizontal segment crossing vertical path (going right)', () => {
		// Horizontal segment from (0,50) to (100,50)
		// Crosses vertical existing path at x=50
		const path: Point[] = [{ x: 0, y: 50 }, { x: 100, y: 50 }];
		const existingPaths: Point[][] = [[{ x: 50, y: 0 }, { x: 50, y: 100 }]];

		const svg = pathToSvgWithHops(path, existingPaths);

		// Should contain an arc command with sweep-flag 0 (counter-clockwise, curves up when going right)
		expect(svg).toContain('A 8 8 0 0 0');
	});

	it('generates arc for horizontal segment going left', () => {
		// Horizontal segment from (100,50) to (0,50) - going LEFT
		const path: Point[] = [{ x: 100, y: 50 }, { x: 0, y: 50 }];
		const existingPaths: Point[][] = [[{ x: 50, y: 0 }, { x: 50, y: 100 }]];

		const svg = pathToSvgWithHops(path, existingPaths);

		// Should contain an arc command with sweep-flag 1 (clockwise, curves up when going left)
		expect(svg).toContain('A 8 8 0 0 1');
	});

	it('generates arc for vertical segment crossing horizontal path (going down)', () => {
		// Vertical segment from (50,0) to (50,100) - going DOWN
		const path: Point[] = [{ x: 50, y: 0 }, { x: 50, y: 100 }];
		const existingPaths: Point[][] = [[{ x: 0, y: 50 }, { x: 100, y: 50 }]];

		const svg = pathToSvgWithHops(path, existingPaths);

		// Should contain an arc command with sweep-flag 1 (clockwise, curves right when going down)
		expect(svg).toContain('A 8 8 0 0 1');
	});

	it('generates arc for vertical segment crossing horizontal path (going up)', () => {
		// Vertical segment from (50,100) to (50,0) - going UP
		const path: Point[] = [{ x: 50, y: 100 }, { x: 50, y: 0 }];
		const existingPaths: Point[][] = [[{ x: 0, y: 50 }, { x: 100, y: 50 }]];

		const svg = pathToSvgWithHops(path, existingPaths);

		// Should contain an arc command with sweep-flag 0 (counter-clockwise, curves right when going up)
		expect(svg).toContain('A 8 8 0 0 0');
	});

	it('deduplicates nearby crossings', () => {
		// Horizontal segment crosses two very close vertical paths
		const path: Point[] = [{ x: 0, y: 50 }, { x: 100, y: 50 }];
		const existingPaths: Point[][] = [
			[{ x: 50, y: 0 }, { x: 50, y: 100 }],
			[{ x: 55, y: 0 }, { x: 55, y: 100 }] // Within 2*HOP_RADIUS (16px)
		];

		const svg = pathToSvgWithHops(path, existingPaths);

		// Should only have one arc, not two
		const arcCount = (svg.match(/A 8 8/g) || []).length;
		expect(arcCount).toBe(1);
	});

	it('generates multiple arcs for distant crossings', () => {
		// Horizontal segment crosses two distant vertical paths
		const path: Point[] = [{ x: 0, y: 50 }, { x: 200, y: 50 }];
		const existingPaths: Point[][] = [
			[{ x: 50, y: 0 }, { x: 50, y: 100 }],
			[{ x: 150, y: 0 }, { x: 150, y: 100 }] // Far enough apart (100px > 16px)
		];

		const svg = pathToSvgWithHops(path, existingPaths);

		// Should have two arcs
		const arcCount = (svg.match(/A 8 8/g) || []).length;
		expect(arcCount).toBe(2);
	});

	it('generates hop on vertical segment of Z-route crossing horizontal existing path', () => {
		// Realistic Z-route: horizontal exit -> vertical -> horizontal entry
		// Path goes from (0,100) -> (50,100) -> (50,200) -> (100,200)
		const path: Point[] = [
			{ x: 0, y: 100 },   // Start
			{ x: 50, y: 100 },  // Exit horizontal
			{ x: 50, y: 200 },  // Vertical segment
			{ x: 100, y: 200 }  // Entry horizontal
		];
		// Existing horizontal path at y=150 crosses the vertical segment at (50, 150)
		const existingPaths: Point[][] = [
			[{ x: 0, y: 150 }, { x: 100, y: 150 }]
		];

		const svg = pathToSvgWithHops(path, existingPaths);

		// Should contain an arc on the vertical segment
		expect(svg).toContain('A 8 8');
		// The arc should be at y around 150 (the crossing point)
		// Going down, sweep-flag should be 1
		expect(svg).toContain('A 8 8 0 0 1');
	});

	it('generates hop when new vertical crosses existing Z-route horizontal segment', () => {
		// New Z-route with vertical at x=75
		const path: Point[] = [
			{ x: 0, y: 200 },   // Start
			{ x: 75, y: 200 },  // Exit horizontal
			{ x: 75, y: 100 },  // Vertical segment (going UP)
			{ x: 150, y: 100 }  // Entry horizontal
		];
		// Existing Z-route with horizontal segment at y=150
		const existingPaths: Point[][] = [
			[
				{ x: 0, y: 50 },    // Start
				{ x: 50, y: 50 },   // Exit horizontal
				{ x: 50, y: 150 },  // Vertical segment
				{ x: 100, y: 150 }  // Entry horizontal - this is what we cross
			]
		];

		const svg = pathToSvgWithHops(path, existingPaths);

		// The vertical segment (75,200) -> (75,100) should cross the horizontal (50,150) -> (100,150)
		// at point (75, 150)
		expect(svg).toContain('A 8 8');
		// Going UP, sweep-flag should be 0
		expect(svg).toContain('A 8 8 0 0 0');
	});
});

describe('detectCoaxialOverlap', () => {
	it('detects horizontal coaxial overlap', () => {
		const newPath: Point[] = [{ x: 0, y: 100 }, { x: 200, y: 100 }];
		const existingPaths: Point[][] = [
			[{ x: 50, y: 100 }, { x: 150, y: 100 }] // Same Y, overlapping X range
		];

		const result = detectCoaxialOverlap(newPath, existingPaths);
		expect(result.count).toBe(1);
		expect(result.totalLength).toBe(100); // Overlap from 50 to 150
	});

	it('detects vertical coaxial overlap', () => {
		const newPath: Point[] = [{ x: 100, y: 0 }, { x: 100, y: 200 }];
		const existingPaths: Point[][] = [
			[{ x: 100, y: 50 }, { x: 100, y: 150 }] // Same X, overlapping Y range
		];

		const result = detectCoaxialOverlap(newPath, existingPaths);
		expect(result.count).toBe(1);
		expect(result.totalLength).toBe(100); // Overlap from 50 to 150
	});

	it('returns zero for non-overlapping parallel segments', () => {
		const newPath: Point[] = [{ x: 0, y: 100 }, { x: 100, y: 100 }];
		const existingPaths: Point[][] = [
			[{ x: 0, y: 200 }, { x: 100, y: 200 }] // Same orientation but different Y
		];

		const result = detectCoaxialOverlap(newPath, existingPaths);
		expect(result.count).toBe(0);
		expect(result.totalLength).toBe(0);
	});

	it('returns zero for perpendicular segments', () => {
		const newPath: Point[] = [{ x: 0, y: 100 }, { x: 100, y: 100 }]; // Horizontal
		const existingPaths: Point[][] = [
			[{ x: 50, y: 0 }, { x: 50, y: 200 }] // Vertical
		];

		const result = detectCoaxialOverlap(newPath, existingPaths);
		expect(result.count).toBe(0);
		expect(result.totalLength).toBe(0);
	});
});

describe('findUsedVerticalChannels', () => {
	it('finds vertical segments in range', () => {
		const paths: Point[][] = [
			[{ x: 50, y: 0 }, { x: 50, y: 100 }],  // Vertical at x=50
			[{ x: 150, y: 0 }, { x: 150, y: 100 }] // Vertical at x=150
		];

		const channels = findUsedVerticalChannels(paths, 0, 200);
		expect(channels).toContain(50);
		expect(channels).toContain(150);
	});

	it('excludes vertical segments outside range', () => {
		const paths: Point[][] = [
			[{ x: 50, y: 0 }, { x: 50, y: 100 }],  // Vertical at x=50
			[{ x: 250, y: 0 }, { x: 250, y: 100 }] // Vertical at x=250 (outside range)
		];

		const channels = findUsedVerticalChannels(paths, 0, 200);
		expect(channels).toContain(50);
		expect(channels).not.toContain(250);
	});

	it('deduplicates nearby vertical channels', () => {
		const paths: Point[][] = [
			[{ x: 50, y: 0 }, { x: 50, y: 100 }],
			[{ x: 55, y: 0 }, { x: 55, y: 100 }] // Within 10px tolerance
		];

		const channels = findUsedVerticalChannels(paths, 0, 200);
		expect(channels.length).toBe(1);
	});
});

describe('getCardEntryPoint', () => {
	const makeCard = (x: number, y: number, width: number, height: number): Card => ({
		id: 'test',
		note: {
			id: 'test-note',
			canvasId: 'test-canvas',
			title: 'Test Note',
			content: { type: 'doc', content: [] },
			wikilinks: []
		},
		position: { x, y },
		dimensions: { width, height },
		parentId: null,
		sourceLink: null
	});

	it('enters from left when coming from the left', () => {
		const card = makeCard(100, 50, 200, 300);
		const fromPoint = { x: 0, y: 100 }; // Coming from left

		const entry = getCardEntryPoint(card, fromPoint);

		// Should enter from left edge (card.x - 8)
		expect(entry.x).toBe(92); // 100 - 8
		expect(entry.y).toBe(70); // card.y + 20
	});

});
