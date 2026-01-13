# Refactor: Connection Line Routing System

## Visual Reference

See `plans/reference-snaking-lines.png` for the target visual outcome.

## Requirements

### 1. Line Behavior

**Exit behavior:**
- Lines exit **horizontally** from the link position in the source card
- Exit direction is toward the target card (right if target is to the right)

**Routing behavior:**
- Lines snake around card obstacles with **orthogonal (90°) turns**
- Lines maintain **minimum clearance** from card edges (~20px)
- Lines can route in any direction to reach the target (down, up, around)

**Entry behavior:**
- Lines enter target cards **horizontally** at the heading level (top of card + ~20px)
- Entry from left or right depending on source position

**Path aesthetics:**
- Smooth **rounded corners** at turns (~20px radius)
- Clean, predictable routing that looks intentional

### 2. Multiple Lines

**Parallel lines:**
- Multiple lines from same source should **not cross each other**
- Lines should maintain **consistent spacing** when running parallel (~10-15px)
- Lines computed earlier should act as obstacles for later lines

**Staggered entry/exit:**
- Multiple connections to same target get **vertically staggered entry points**
- Multiple connections from same source may need **staggered exit points**

### 3. Error Handling

**No silent failures:**
- If routing fails, show a **visible error state** (red dashed line)
- Log **detailed error** to console with coordinates and reason
- Never silently delete or hide a connection

**Error classification:**
- Distinguish between "blocked", "timeout", and "impossible" cases
- Surface error type visually in debug mode

### 4. Debug Visualization

**Required debug overlays (toggle-able):**
- Card obstacle zones (padding around cards)
- Path obstacle corridors (space taken by existing lines)
- Grid walkability (which cells are blocked)
- Crossing indicators (if any lines cross)
- Failed path indicators with reason

**Optional debug features:**
- A* exploration animation (open/closed sets)
- Iteration count per path
- Turn penalty application points

### 5. Performance

- Path computation should be **< 100ms** for typical usage (10-20 cards)
- Grid should be **cached** and only rebuilt when cards change
- Paths should be computed **sequentially** with obstacle accumulation

---

## Current Implementation Issues

| Issue | Impact |
|-------|--------|
| Lines cross despite sequential computation | Visual mess, defeats purpose |
| Y-sort ordering doesn't guarantee no crossings | Diagonal paths can still cross |
| Turn penalty (50) may be too aggressive | Paths detour excessively |
| No source exit staggering | Multiple outbound lines overlap |
| Grid resolution (10px) may be too coarse | Routing gets stuck in tight spaces |

---

## Approach Options

### Option A: Fix Current A* Implementation

**Keep:** Grid-based A* with turn penalty
**Fix:**
- Add source exit staggering
- Tune turn penalty
- Improve exit/entry point selection
- Add crossing detection

**Pros:** Incremental, less risk
**Cons:** May not solve fundamental issues

### Option B: Orthogonal Visibility Graph

**Replace with:** Visibility graph approach (used by libavoid, yFiles)

**How it works:**
1. Project horizontal/vertical lines from all obstacle corners
2. Build graph of intersection points
3. A* through visibility graph (much smaller search space)
4. Nudge overlapping segments apart

**Pros:** Industry-proven, guarantees optimal routes
**Cons:** More complex implementation

### Option C: Channel-Based Routing

**Replace with:** Horizontal/vertical channel approach

**How it works:**
1. Divide space into horizontal and vertical channels between cards
2. Route through channels with simple rules
3. Assign tracks within channels for parallel lines

**Pros:** Very predictable, easy to debug
**Cons:** Less flexible for arbitrary layouts

### Option D: Hybrid Approach

**Combine:** Simple heuristic routing with A* fallback

**How it works:**
1. Try simple L-route or Z-route first
2. If blocked, use A* to find path around
3. Post-process to detect/fix crossings

**Pros:** Fast for common cases, robust for edge cases
**Cons:** May produce inconsistent path styles

---

## Recommended Approach

**Option D (Hybrid)** with emphasis on predictable routing:

### Phase 1: Simple Heuristic Router

For most connections, a simple algorithm suffices:

```
1. Exit horizontally from source toward target
2. If target is roughly aligned, go straight
3. Otherwise:
   a. Go horizontal to clear source card
   b. Go vertical toward target Y
   c. Go horizontal to target
4. Check for collisions with obstacles
5. If collision, try routing around (above or below)
```

### Phase 2: A* Fallback

When heuristic fails:
- Use current A* implementation
- Lower turn penalty for tighter routing
- Ensure path doesn't cross existing paths

### Phase 3: Crossing Detection & Resolution

After all paths computed:
- Detect any remaining crossings
- Attempt to reroute one of the crossing paths
- If unavoidable, mark as error state

### Phase 4: Debug Visualization

Comprehensive debug overlay:
- Show which routing method was used per path
- Show obstacle grid
- Show crossing points
- Show failure reasons

---

## Implementation Plan

### Step 1: Define Path Result Type

```typescript
type PathResult =
  | { status: 'success'; path: Point[]; method: 'heuristic' | 'astar' }
  | { status: 'failed'; reason: string; fallbackPath: Point[] };
```

### Step 2: Implement Heuristic Router

New function that tries simple routing patterns before A*:

```typescript
function routeConnection(
  source: Point,
  target: Point,
  obstacles: Card[],
  existingPaths: Point[][]
): PathResult
```

### Step 3: Implement Crossing Detection

```typescript
function detectCrossings(paths: Point[][]): CrossingInfo[]
function attemptReroute(path: Point[], crossings: CrossingInfo[]): PathResult
```

### Step 4: Enhance Debug Overlay

- Add toggle for each debug layer
- Color-code by routing method
- Show crossing indicators

### Step 5: Tune Parameters

- Test with reference scenario (silences → john-cage, pauline-oliveros, rebecca-solnit)
- Adjust turn penalty, clearances, staggering distances
- Verify against reference screenshot

---

## Acceptance Criteria

### Must Have
- [ ] Lines exit horizontally from source
- [ ] Lines route around obstacles with orthogonal turns
- [ ] Lines enter target horizontally at heading level
- [ ] Multiple lines from same source don't cross
- [ ] Failed routing shows visible error (not hidden)
- [ ] Debug mode shows obstacle zones and path corridors

### Should Have
- [ ] Parallel lines maintain consistent spacing
- [ ] Smooth rounded corners on turns
- [ ] Staggered entry points for multiple connections to same target
- [ ] Error classification (blocked vs timeout vs impossible)

### Nice to Have
- [ ] A* exploration animation in debug mode
- [ ] Crossing reroute attempts
- [ ] Path method indicator (heuristic vs A*)

---

## Test Scenarios

### Primary Test: "Silences" Card
1. Open Silences card
2. Click john-cage, pauline-oliveros, rebecca-solnit links
3. **Expected:** Three parallel lines routing to right without crossing
4. **Reference:** See `plans/reference-snaking-lines.png`

### Secondary Tests
- Dense card cluster (5+ cards in tight space)
- Long-distance connection (cards far apart)
- Diagonal target (target at 45° angle from source)
- Blocked path (obstacle directly between source and target)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/utils/pathfinding.ts` | Add heuristic router, crossing detection |
| `src/lib/components/Canvas.svelte` | Update path computation, enhance debug |
| `src/lib/types/index.ts` | Add PathResult type, crossing types |
| `src/lib/components/ConnectionLine.svelte` | Error state styling |

---

## References

### Visual Reference
- `plans/reference-snaking-lines.png` - Target outcome
- `plans/incorrect-line-crossing.png` - Current broken state

### Internal Code
- Current A*: `src/lib/utils/pathfinding.ts:344-429`
- Path computation: `src/lib/components/Canvas.svelte:334-440`
- Debug overlay: `src/lib/components/Canvas.svelte:446-538`

### External
- [Orthogonal Connector Routing (paper)](https://people.eng.unimelb.edu.au/pstuckey/papers/gd09.pdf)
- [libavoid documentation](https://www.adaptagrams.org/documentation/libavoid.html)
- [JointJS Manhattan Router](https://docs.jointjs.com/learn/features/links)
