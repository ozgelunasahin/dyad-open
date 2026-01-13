# Feature Plan: Newspaper Layout + A* Pathfinding

## Overview

Transform the spatial reader from a radial card layout to a newspaper/broadsheet-style typographic system with intelligent orthogonal connection routing.

### Goals
1. Cards placed with priority: **right → below → left**
2. Full-height cards (no internal scrolling)
3. Adaptive width based on content
4. Typographic alignment like a broadsheet newspaper
5. A* pathfinding for connection lines that avoid obstacles
6. Smooth 90-degree turns with rounded corners
7. Focus changes smoothly recenter the view
8. Scroll moves view over currently focused card

---

## Phase 1: Content Measurement System

### 1.1 Pre-render Height Measurement

Create a measurement utility to determine card dimensions before placement.

**File: `src/lib/utils/measure.ts`**

```typescript
export interface ContentDimensions {
  width: number;
  height: number;
  lineCount: number;
}

export function measureMarkdownContent(
  content: string,
  targetWidth: number,
  styles: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
  }
): ContentDimensions {
  // Create hidden measurement container
  const measurer = document.createElement('div');
  Object.assign(measurer.style, {
    position: 'absolute',
    visibility: 'hidden',
    width: `${targetWidth}px`,
    fontSize: `${styles.fontSize}px`,
    lineHeight: `${styles.lineHeight}`,
    fontFamily: styles.fontFamily,
  });

  measurer.innerHTML = parseMarkdown(content);
  document.body.appendChild(measurer);

  const rect = measurer.getBoundingClientRect();
  document.body.removeChild(measurer);

  return {
    width: targetWidth,
    height: Math.ceil(rect.height),
    lineCount: Math.ceil(rect.height / (styles.fontSize * styles.lineHeight))
  };
}
```

### 1.2 Update Types

**File: `src/lib/types/index.ts`**

```typescript
export interface Card {
  id: string;
  note: Note;
  position: Point;
  dimensions: { width: number; height: number }; // NEW
  parentId: string | null;
  sourceLink: Point | null;
}

// Remove fixed dimensions
// export const CARD_WIDTH = 320;  // REMOVE
// export const CARD_HEIGHT = 240; // REMOVE

export const MIN_CARD_WIDTH = 280;
export const MAX_CARD_WIDTH = 400;
export const CARD_SPACING = 40;
export const GRID_CELL_SIZE = 10; // For pathfinding grid
```

---

## Phase 2: Priority-Based Placement Algorithm

### 2.1 Newspaper Layout Engine

**File: `src/lib/utils/layout.ts`**

```typescript
type PlacementDirection = 'right' | 'below' | 'left';

interface PlacementCandidate {
  position: Point;
  direction: PlacementDirection;
  alignmentScore: number; // Higher = better alignment with existing cards
}

export function calculateNewCardPosition(
  parentCard: Card | null,
  existingCards: Card[],
  linkPosition: Point | null,
  newCardDimensions: { width: number; height: number }
): { position: Point; direction: PlacementDirection } {
  if (!parentCard) {
    return { position: { x: 0, y: 0 }, direction: 'right' };
  }

  const candidates: PlacementCandidate[] = [];
  const priorities: PlacementDirection[] = ['right', 'below', 'left'];

  for (const direction of priorities) {
    const candidate = tryPlacement(
      parentCard,
      direction,
      newCardDimensions,
      existingCards
    );
    if (candidate) {
      candidates.push(candidate);
    }
  }

  // Return first valid candidate (respects priority order)
  if (candidates.length > 0) {
    const best = candidates[0];
    return { position: best.position, direction: best.direction };
  }

  // Fallback: spiral outward from parent
  return {
    position: findFirstAvailablePosition(parentCard, existingCards, newCardDimensions),
    direction: 'below'
  };
}

function tryPlacement(
  parent: Card,
  direction: PlacementDirection,
  dimensions: { width: number; height: number },
  existingCards: Card[]
): PlacementCandidate | null {
  let position: Point;

  switch (direction) {
    case 'right':
      position = {
        x: parent.position.x + parent.dimensions.width + CARD_SPACING,
        y: parent.position.y // Align tops
      };
      break;
    case 'below':
      position = {
        x: parent.position.x, // Align left edges
        y: parent.position.y + parent.dimensions.height + CARD_SPACING
      };
      break;
    case 'left':
      position = {
        x: parent.position.x - dimensions.width - CARD_SPACING,
        y: parent.position.y // Align tops
      };
      break;
  }

  // Check for overlaps
  if (hasOverlap(position, dimensions, existingCards)) {
    return null;
  }

  return {
    position,
    direction,
    alignmentScore: calculateAlignmentScore(position, dimensions, existingCards)
  };
}

function calculateAlignmentScore(
  position: Point,
  dimensions: { width: number; height: number },
  existingCards: Card[]
): number {
  let score = 0;

  for (const card of existingCards) {
    // Reward alignment with existing card edges
    if (Math.abs(position.x - card.position.x) < 5) score += 10; // Left aligned
    if (Math.abs(position.y - card.position.y) < 5) score += 10; // Top aligned

    // Reward baseline alignment (bottom edges)
    const thisBottom = position.y + dimensions.height;
    const cardBottom = card.position.y + card.dimensions.height;
    if (Math.abs(thisBottom - cardBottom) < 5) score += 15;
  }

  return score;
}
```

### 2.2 Adaptive Width Calculation

```typescript
export function calculateOptimalWidth(
  content: string,
  availableWidth: number
): number {
  // Estimate content length
  const charCount = content.length;
  const wordCount = content.split(/\s+/).length;

  // Shorter content gets narrower cards
  if (charCount < 500) {
    return Math.max(MIN_CARD_WIDTH, Math.min(320, availableWidth));
  } else if (charCount < 1500) {
    return Math.max(MIN_CARD_WIDTH, Math.min(360, availableWidth));
  } else {
    return Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, availableWidth));
  }
}
```

---

## Phase 3: A* Pathfinding System

### 3.1 Grid-Based Obstacle Map

**File: `src/lib/utils/pathfinding.ts`**

```typescript
const CELL_SIZE = 10; // 10px grid cells
const PADDING = 15;   // Buffer around cards
const TURN_PENALTY = 50; // Penalize direction changes

interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
}

export class PathfindingGrid {
  private grid: boolean[][];
  private cols: number;
  private rows: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    cards: Card[]
  ) {
    this.cols = Math.ceil(canvasWidth / CELL_SIZE);
    this.rows = Math.ceil(canvasHeight / CELL_SIZE);
    this.grid = this.buildGrid(cards);
  }

  private buildGrid(cards: Card[]): boolean[][] {
    // Initialize all cells as walkable
    const grid = Array(this.rows)
      .fill(null)
      .map(() => Array(this.cols).fill(true));

    // Mark card regions as unwalkable (with padding)
    for (const card of cards) {
      const left = Math.floor((card.position.x - PADDING) / CELL_SIZE);
      const right = Math.ceil((card.position.x + card.dimensions.width + PADDING) / CELL_SIZE);
      const top = Math.floor((card.position.y - PADDING) / CELL_SIZE);
      const bottom = Math.ceil((card.position.y + card.dimensions.height + PADDING) / CELL_SIZE);

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
      x: Math.floor(canvasPoint.x / CELL_SIZE),
      y: Math.floor(canvasPoint.y / CELL_SIZE)
    };
  }

  toCanvasCoords(gridPoint: Point): Point {
    return {
      x: gridPoint.x * CELL_SIZE + CELL_SIZE / 2,
      y: gridPoint.y * CELL_SIZE + CELL_SIZE / 2
    };
  }
}
```

### 3.2 A* Algorithm with Direction Penalty

```typescript
interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
  direction: 'up' | 'down' | 'left' | 'right' | null;
}

const DIRECTIONS = [
  { dx: 0, dy: -1, name: 'up' as const },
  { dx: 1, dy: 0, name: 'right' as const },
  { dx: 0, dy: 1, name: 'down' as const },
  { dx: -1, dy: 0, name: 'left' as const },
];

export function findOrthogonalPath(
  grid: PathfindingGrid,
  start: Point,
  end: Point,
  initialDirection?: 'up' | 'down' | 'left' | 'right'
): Point[] {
  const startGrid = grid.toGridCoords(start);
  const endGrid = grid.toGridCoords(end);

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    ...startGrid,
    g: 0,
    h: manhattanDistance(startGrid, endGrid),
    f: manhattanDistance(startGrid, endGrid),
    parent: null,
    direction: initialDirection || null
  };

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = `${current.x},${current.y}`;

    if (current.x === endGrid.x && current.y === endGrid.y) {
      return reconstructPath(current, grid);
    }

    closedSet.add(currentKey);

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

      const existingIdx = openSet.findIndex(n => n.x === nx && n.y === ny);

      if (existingIdx === -1) {
        openSet.push({
          x: nx,
          y: ny,
          g,
          h,
          f: g + h,
          parent: current,
          direction: dir.name
        });
      } else if (g < openSet[existingIdx].g) {
        openSet[existingIdx].g = g;
        openSet[existingIdx].f = g + h;
        openSet[existingIdx].parent = current;
        openSet[existingIdx].direction = dir.name;
      }
    }
  }

  return []; // No path found
}

function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(node: AStarNode, grid: PathfindingGrid): Point[] {
  const path: Point[] = [];
  let current: AStarNode | null = node;

  while (current) {
    path.unshift(grid.toCanvasCoords({ x: current.x, y: current.y }));
    current = current.parent;
  }

  return compressPath(path);
}
```

### 3.3 Path Compression and SVG Generation

```typescript
// Remove intermediate points on straight lines
function compressPath(path: Point[]): Point[] {
  if (path.length < 3) return path;

  const compressed: Point[] = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = compressed[compressed.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Keep only corner points (where direction changes)
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

// Generate SVG path with rounded corners
export function pathToSvgWithRoundedCorners(
  points: Point[],
  cornerRadius: number = 8
): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate max radius based on segment lengths
    const distPrev = Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
    const distNext = Math.abs(next.x - curr.x) + Math.abs(next.y - curr.y);
    const radius = Math.min(cornerRadius, distPrev / 2, distNext / 2);

    // Approach point
    const approachX = curr.x === prev.x ? curr.x : curr.x - Math.sign(curr.x - prev.x) * radius;
    const approachY = curr.y === prev.y ? curr.y : curr.y - Math.sign(curr.y - prev.y) * radius;

    // Departure point
    const departX = curr.x === next.x ? curr.x : curr.x + Math.sign(next.x - curr.x) * radius;
    const departY = curr.y === next.y ? curr.y : curr.y + Math.sign(next.y - curr.y) * radius;

    d += ` L ${approachX} ${approachY}`;
    d += ` Q ${curr.x} ${curr.y} ${departX} ${departY}`;
  }

  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}
```

---

## Phase 4: Smooth Focus and View Centering

### 4.1 Update Canvas Store

**File: `src/lib/stores/canvas.svelte.ts`**

```typescript
class CanvasStore {
  // ... existing fields ...

  focusedCardId = $state<string | null>(null);
  scrollOffset = $state<number>(0); // Vertical scroll within focused card
  isAnimating = $state<boolean>(false);

  focusCard(cardId: string): void {
    const card = this.cards.get(cardId);
    if (!card) return;

    this.focusedCardId = cardId;
    this.scrollOffset = 0;

    // Trigger smooth pan to center on card
    this.animateToCenterOn(card);
  }

  private animateToCenterOn(card: Card): void {
    if (typeof window === 'undefined') return;

    const targetX = -(card.position.x + card.dimensions.width / 2);
    const targetY = -(card.position.y + card.dimensions.height / 2);

    // Emit event for Canvas component to handle animation
    this.isAnimating = true;
    window.dispatchEvent(new CustomEvent('canvas-focus', {
      detail: { x: targetX, y: targetY, cardId: card.id }
    }));
  }

  scrollFocusedCard(deltaY: number): void {
    if (!this.focusedCardId) return;

    const card = this.cards.get(this.focusedCardId);
    if (!card) return;

    // Calculate max scroll based on card height vs viewport
    const viewportHeight = window.innerHeight;
    const maxScroll = Math.max(0, card.dimensions.height - viewportHeight + 100);

    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
  }
}
```

### 4.2 Update Canvas Component

**File: `src/lib/components/Canvas.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { zoom, zoomIdentity } from 'd3-zoom';
  import { select } from 'd3-selection';
  import { interpolate } from 'd3-interpolate';
  import { easeQuadOut } from 'd3-ease';

  // ... existing code ...

  function handleWheel(event: WheelEvent) {
    // If focused on a card, scroll within it instead of zooming
    if (canvasStore.focusedCardId && !event.ctrlKey) {
      event.preventDefault();
      canvasStore.scrollFocusedCard(event.deltaY);
      return;
    }
  }

  onMount(() => {
    // ... existing zoom setup ...

    // Listen for focus animation requests
    window.addEventListener('canvas-focus', handleFocusAnimation);

    return () => {
      window.removeEventListener('canvas-focus', handleFocusAnimation);
    };
  });

  function handleFocusAnimation(event: CustomEvent) {
    const { x, y, cardId } = event.detail;

    const selection = select(svg);
    const duration = 400;

    const startTransform = transform;
    const endX = x * transform.k + window.innerWidth / 2;
    const endY = y * transform.k + window.innerHeight / 2;

    selection.transition()
      .duration(duration)
      .ease(easeQuadOut)
      .tween('transform', () => {
        const ix = interpolate(transform.x, endX);
        const iy = interpolate(transform.y, endY);

        return (t: number) => {
          transform = { ...transform, x: ix(t), y: iy(t) };
        };
      })
      .on('end', () => {
        canvasStore.isAnimating = false;
      });
  }
</script>

<svelte:window onwheel={handleWheel} />
```

---

## Phase 5: ConnectionLine Update

### 5.1 Pathfinding-Based Connections

**File: `src/lib/components/ConnectionLine.svelte`**

```svelte
<script lang="ts">
  import type { Point, Card } from '$lib/types';
  import { PathfindingGrid, findOrthogonalPath, pathToSvgWithRoundedCorners } from '$lib/utils/pathfinding';
  import { canvasStore } from '$lib/stores/canvas.svelte';

  interface Props {
    fromCard: Card;
    toCard: Card;
    sourcePoint: Point;
    isActive: boolean;
  }

  let { fromCard, toCard, sourcePoint, isActive }: Props = $props();

  // Compute path avoiding obstacles
  let path = $derived.by(() => {
    // Exclude source and target cards from obstacles
    const obstacles = canvasStore.cardList.filter(
      c => c.id !== fromCard.id && c.id !== toCard.id
    );

    // Build pathfinding grid
    const grid = new PathfindingGrid(
      2000, // Canvas bounds - could be dynamic
      2000,
      obstacles
    );

    // Start from source point, end at target card edge
    const endPoint = getCardEntryPoint(toCard, sourcePoint);
    const initialDir = getInitialDirection(fromCard, sourcePoint);

    const pathPoints = findOrthogonalPath(grid, sourcePoint, endPoint, initialDir);

    if (pathPoints.length < 2) {
      // Fallback: simple bezier
      return createFallbackPath(sourcePoint, endPoint);
    }

    return pathToSvgWithRoundedCorners(pathPoints, 8);
  });

  function getCardEntryPoint(card: Card, from: Point): Point {
    const centerX = card.position.x + card.dimensions.width / 2;
    const centerY = card.position.y + card.dimensions.height / 2;

    // Determine which edge to enter from
    const dx = centerX - from.x;
    const dy = centerY - from.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Enter from left or right
      return {
        x: dx > 0 ? card.position.x : card.position.x + card.dimensions.width,
        y: Math.max(card.position.y, Math.min(card.position.y + card.dimensions.height, from.y))
      };
    } else {
      // Enter from top or bottom
      return {
        x: Math.max(card.position.x, Math.min(card.position.x + card.dimensions.width, from.x)),
        y: dy > 0 ? card.position.y : card.position.y + card.dimensions.height
      };
    }
  }

  function getInitialDirection(card: Card, point: Point): 'up' | 'down' | 'left' | 'right' {
    // Start by going away from the card
    const centerX = card.position.x + card.dimensions.width / 2;
    const centerY = card.position.y + card.dimensions.height / 2;

    // Determine which side of card the point is closest to
    const toLeft = point.x - card.position.x;
    const toRight = (card.position.x + card.dimensions.width) - point.x;
    const toTop = point.y - card.position.y;
    const toBottom = (card.position.y + card.dimensions.height) - point.y;

    const min = Math.min(toLeft, toRight, toTop, toBottom);

    if (min === toBottom) return 'down';
    if (min === toTop) return 'up';
    if (min === toRight) return 'right';
    return 'left';
  }
</script>

<path d={path} class="connection" class:active={isActive} fill="none" />
```

---

## Phase 6: NoteCard Update

### 6.1 Full Height Cards

**File: `src/lib/components/NoteCard.svelte`**

```svelte
<foreignObject
  x={card.position.x}
  y={card.position.y}
  width={card.dimensions.width}
  height={card.dimensions.height}
  class="text-block-container"
>
  <div
    xmlns="http://www.w3.org/1999/xhtml"
    class="text-block"
    class:dimmed={!isActive}
    class:focused={canvasStore.focusedCardId === card.id}
    onclick={handleClick}
    bind:this={contentEl}
    style:transform="translateY(-{canvasStore.focusedCardId === card.id ? canvasStore.scrollOffset : 0}px)"
  >
    {@html html}
  </div>
</foreignObject>

<style>
  .text-block {
    height: 100%;
    overflow: hidden; /* No scrolling - use view scroll instead */
    /* ... existing styles ... */
  }

  .text-block.focused {
    /* Visual indicator for focused card */
  }
</style>
```

---

## Implementation Order

1. **Phase 1: Content Measurement** (Day 1)
   - Create `measure.ts`
   - Update types to support dynamic dimensions
   - Test measurement accuracy

2. **Phase 2: Priority Placement** (Day 2)
   - Implement new `calculateNewCardPosition`
   - Add alignment scoring
   - Test placement priority (right → below → left)

3. **Phase 3: A* Pathfinding** (Days 3-4)
   - Build `PathfindingGrid` class
   - Implement A* with direction penalty
   - Add path compression and SVG generation
   - Test obstacle avoidance

4. **Phase 4: Focus Animation** (Day 5)
   - Add `focusedCardId` and scroll state
   - Implement smooth pan animation
   - Add scroll-to-read behavior

5. **Phase 5-6: Component Updates** (Day 6)
   - Update ConnectionLine with pathfinding
   - Update NoteCard for full-height display
   - Integration testing

---

## Testing Checklist

- [ ] Cards place correctly: right → below → left priority
- [ ] Cards have adaptive widths based on content
- [ ] Cards display full height without internal scroll
- [ ] Connection lines avoid card obstacles
- [ ] Lines use smooth 90-degree corners
- [ ] Lines "snake out" from beneath link position
- [ ] Clicking a link smoothly centers view on new card
- [ ] Scrolling moves view over focused card content
- [ ] Performance: pathfinding completes < 16ms
- [ ] Edge cases: many cards, long content, tight spaces

---

## Dependencies

No new dependencies required. Using:
- Existing d3-zoom, d3-selection
- Add d3-interpolate, d3-ease (may already be included)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Pathfinding too slow | Cache grid, throttle recalculation |
| No valid path found | Fallback to bezier curves |
| Content measurement inaccurate | Use actual DOM measurement, not canvas |
| Scroll conflicts with zoom | Use Ctrl+scroll for zoom, plain scroll for card |
