# Fix Coaxial Line Overlap

## Problem
When multiple cards branch from the same parent, their connection lines share horizontal segments (coaxial overlap). This creates visual confusion that can't be solved with simple hop-over arcs.

Current behavior:
```
Parent Card ──┬── Child 1
              ├── Child 2  (lines overlap on horizontal segment)
              └── Child 3
```

## Root Cause Analysis

1. **Single column placement**: All children go to column N+1
2. **Shared exit point**: All paths exit parent at the same horizontal level
3. **Same routing channel**: All paths use the same vertical X in the gap
4. **Sequential Y stacking**: Children stack vertically, creating long shared horizontals

## Solution: Multi-Candidate Layout with Coaxial Scoring

### Approach
Generate multiple candidate positions for each new card, score each based on coaxial overlap potential, and pick the best.

### Phase 1: Detect Coaxial Overlap

Add function to detect when two path segments are coaxial (parallel and overlapping):

```typescript
function detectCoaxialOverlap(
  newPath: Point[],
  existingPaths: Point[][]
): { count: number; totalLength: number }
```

Two segments are coaxial if:
- Both horizontal: same Y (within tolerance), X ranges overlap
- Both vertical: same X (within tolerance), Y ranges overlap

### Phase 2: Expand Candidate Generation

Current: Try Y offsets in column N+1, fallback to N+2

New candidates to try:
1. **Multiple columns**: N+1, N+2, N+3 (spread children across columns)
2. **Left-side placement**: Column N-1 when target has back-reference or right is congested
3. **Vertical spread**: Larger Y offsets to create routing gaps between paths
4. **Staggered routing**: Different vertical X positions for different children

```typescript
interface LayoutCandidate {
  position: Point;
  column: number;
  routingX: number;  // Where vertical segment will be
  score: number;
}

function generateCandidates(
  parentCard: Card,
  linkPosition: Point,
  newCardDimensions: Dimensions,
  existingCards: Card[],
  existingPaths: Point[][]
): LayoutCandidate[]
```

### Phase 3: Score Candidates

For each candidate, simulate the path and score it:

```typescript
function scoreCandidatePosition(
  candidate: LayoutCandidate,
  parentCard: Card,
  linkPosition: Point,
  existingCards: Card[],
  existingPaths: Point[][]
): number {
  // Penalties (lower is better)
  let score = 0;

  // 1. Card overlap (disqualifying)
  if (hasOverlap(...)) return Infinity;

  // 2. Coaxial overlap with existing paths
  const simPath = simulatePath(linkPosition, candidate.position, ...);
  const coaxial = detectCoaxialOverlap(simPath, existingPaths);
  score += coaxial.count * 100;      // Penalty per coaxial segment
  score += coaxial.totalLength * 1;  // Penalty per pixel of overlap

  // 3. Path crossings (perpendicular ok with hop, but still minor penalty)
  const crossings = countCrossings(simPath, existingPaths);
  score += crossings * 10;

  // 4. Distance from ideal position (prefer close to link Y)
  const yDistance = Math.abs(candidate.position.y - (linkPosition.y - 20));
  score += yDistance * 0.1;

  // 5. Column preference (N+1 preferred, N+2 ok, N-1 for back-refs)
  score += Math.abs(candidate.column - parentColumn - 1) * 50;

  return score;
}
```

### Phase 4: Routing Channel Assignment

Instead of all paths using the same vertical X, assign unique channels:

```typescript
function assignRoutingChannel(
  sourceCard: Card,
  targetColumn: number,
  existingPaths: Point[][]
): number {
  const gapStart = sourceCard.position.x + sourceCard.dimensions.width + 10;
  const gapEnd = targetColumn * COLUMN_WIDTH - 10;
  const gapWidth = gapEnd - gapStart;

  // Find existing vertical segments in this gap
  const usedChannels = findUsedVerticalChannels(existingPaths, gapStart, gapEnd);

  // Assign next available channel (step by 15px)
  const channelStep = 15;
  for (let offset = 0; offset < gapWidth / 2; offset += channelStep) {
    const midX = (gapStart + gapEnd) / 2;
    const candidates = [midX + offset, midX - offset];

    for (const x of candidates) {
      if (!usedChannels.some(c => Math.abs(c - x) < channelStep)) {
        return x;
      }
    }
  }

  return (gapStart + gapEnd) / 2; // Fallback
}
```

## Implementation Steps

### Step 1: Add coaxial detection to pathfinding.ts
- `detectCoaxialOverlap()` function
- `findUsedVerticalChannels()` function

### Step 2: Expand candidate generation in layout.ts
- Generate candidates across multiple columns
- Include left-side candidates when appropriate
- Try multiple routing X positions

### Step 3: Add scoring function
- `scoreCandidatePosition()` with coaxial penalty
- `simulatePath()` to preview path without storing

### Step 4: Update calculateNewCardPosition
- Generate all candidates
- Score each
- Return best scoring position + routing X

### Step 5: Update routeConnection to use assigned routing X
- Pass routing X from layout to pathfinding
- Store routing X assignment per card

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/utils/pathfinding.ts` | Add coaxial detection, channel assignment |
| `src/lib/utils/layout.ts` | Multi-candidate generation, scoring |
| `src/lib/stores/canvas.svelte.ts` | Store routing X per connection |
| `src/lib/types/index.ts` | Add LayoutCandidate type |

## Verification

1. Reset canvas (Escape)
2. Enable debug mode
3. Click "Open all links"
4. Verify:
   - Lines don't overlap coaxially
   - Cards spread across multiple columns when needed
   - Perpendicular crossings show hop arcs
   - Visual clarity is improved

## Visual Goal

```
              ┌── Child A (col N+2)
Parent Card ──┤
              │   ┌── Child B (col N+1, different vertical X)
              └───┤
                  └── Child C (col N+1, spread Y)
```

Instead of:
```
Parent Card ─────┬── Child A
                 ├── Child B  (coaxial overlap!)
                 └── Child C
```
