import { flextree } from 'd3-flextree';
import type { Vault, Note } from '$lib/types';
import type { Dimensions, Point } from '$lib/types';
import { calculateOptimalWidthFromJson, estimateContentHeight } from './json-content';
import { MIN_CARD_WIDTH, MAX_CARD_WIDTH, CARD_SPACING } from '$lib/types';

const COLUMN_GAP = 120; // Horizontal gap between columns
const SIBLING_GAP = 40; // Vertical gap between siblings

/**
 * Tree node for layout computation
 */
interface TreeNode {
	id: string;
	dimensions: Dimensions;
	children?: TreeNode[];
}

/**
 * Pre-computed position for a note
 */
export interface PrecomputedPosition {
	position: Point;
	dimensions: Dimensions;
	parentId: string | null;
}

/**
 * Cache of pre-computed positions keyed by "rootId:noteId"
 */
export type PositionCache = Map<string, PrecomputedPosition>;

/**
 * Build a tree structure from a root note, following wikilinks to specified depth.
 */
function buildTree(
	vault: Vault,
	rootId: string,
	depth: number,
	visited: Set<string> = new Set()
): TreeNode | null {
	if (depth < 0 || visited.has(rootId)) return null;

	const note = vault.notes[rootId];
	if (!note) return null;

	visited.add(rootId);

	// Calculate dimensions for this note
	const width = calculateOptimalWidthFromJson(note.content, MIN_CARD_WIDTH, MAX_CARD_WIDTH);
	const height = estimateContentHeight(note.content, width);

	const node: TreeNode = {
		id: rootId,
		dimensions: { width, height: Math.max(100, height) },
		children: []
	};

	// Recursively add children from wikilinks
	if (depth > 0 && note.wikilinks && note.wikilinks.length > 0) {
		for (const linkTarget of note.wikilinks) {
			const childNode = buildTree(vault, linkTarget, depth - 1, new Set(visited));
			if (childNode) {
				node.children!.push(childNode);
			}
		}
	}

	// Remove empty children array
	if (node.children!.length === 0) {
		delete node.children;
	}

	return node;
}

/**
 * Compute layout positions for a tree using d3-flextree.
 * Returns a map of noteId -> PrecomputedPosition
 */
export function computeTreeLayout(
	vault: Vault,
	rootId: string,
	depth: number = 3
): PositionCache {
	const cache: PositionCache = new Map();

	// Build the tree structure
	const tree = buildTree(vault, rootId, depth);
	if (!tree) return cache;

	// Create flextree layout
	// Note: flextree uses [width, height] for horizontal trees
	// We want a left-to-right tree, so we swap: nodeSize is [height, width]
	const layout = flextree<TreeNode>({
		children: (d) => d.children,
		nodeSize: (node) => {
			// For horizontal tree: [vertical extent, horizontal extent]
			return [node.data.dimensions.height + SIBLING_GAP, node.data.dimensions.width + COLUMN_GAP];
		},
		spacing: (a, b) => {
			// Additional spacing between non-siblings
			return a.parent === b.parent ? 0 : SIBLING_GAP / 2;
		}
	});

	// Build hierarchy and compute layout
	const hierarchy = layout.hierarchy(tree, d => d.children);
	layout(hierarchy);

	// Extract positions from the computed layout
	// flextree gives us (x, y) where x is vertical position, y is horizontal (depth)
	// We need to transform to our coordinate system

	// Find the minimum x (topmost node) to normalize positions
	let minX = Infinity;
	hierarchy.each(node => {
		minX = Math.min(minX, node.x);
	});

	// Convert to our coordinate system and cache
	hierarchy.each(node => {
		const normalizedX = node.x - minX; // Vertical position (normalized to start at 0)
		const depthY = node.y; // Horizontal position (depth-based)

		cache.set(`${rootId}:${node.data.id}`, {
			position: {
				x: depthY, // Depth becomes X (left-to-right)
				y: normalizedX // Vertical spread becomes Y
			},
			dimensions: node.data.dimensions,
			parentId: node.parent?.data.id || null
		});
	});

	return cache;
}

/**
 * Get a pre-computed position for a note, or null if not cached.
 */
export function getCachedPosition(
	cache: PositionCache,
	rootId: string,
	noteId: string
): PrecomputedPosition | null {
	return cache.get(`${rootId}:${noteId}`) || null;
}

/**
 * Debug: log the tree structure
 */
export function debugTreeStructure(vault: Vault, rootId: string, depth: number = 3): void {
	const tree = buildTree(vault, rootId, depth);
	console.log('[TreeLayout] Tree structure:', JSON.stringify(tree, null, 2));
}

/**
 * Debug: log computed positions
 */
export function debugPositions(cache: PositionCache): void {
	console.log('[TreeLayout] Computed positions:');
	for (const [key, pos] of cache) {
		console.log(`  ${key}: (${pos.position.x.toFixed(0)}, ${pos.position.y.toFixed(0)}) ${pos.dimensions.width}x${pos.dimensions.height}`);
	}
}
