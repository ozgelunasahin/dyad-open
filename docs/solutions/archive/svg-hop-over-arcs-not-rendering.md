---
title: "SVG hop-over arcs invisible at path crossings despite correct path generation"
category: ui-bugs
tags:
  - svg
  - pathfinding
  - arc-rendering
  - connection-lines
  - svelte
  - canvas
severity: medium
component: pathfinding
date_solved: 2025-01-14
symptoms:
  - Connection lines fail to display visible hop-over arcs at crossing points
  - Console logs confirm crossing detection is working correctly
  - Arc SVG commands are being generated in path data
  - Arcs render as straight lines or curve in wrong direction
related_issues: []
files_changed:
  - src/lib/utils/pathfinding.ts
---

# SVG Hop-Over Arcs Not Rendering at Path Crossings

## Problem Summary

In a Svelte 5 spatial canvas application, connection lines between cards should display semicircular "hop-over" arcs where they cross other paths. Despite console logs showing that crossings were being detected and SVG arc commands were being generated, the arcs were either invisible or curving in the wrong direction.

## Symptoms

1. Connection lines appeared to pass straight through each other without visual indication
2. Console showed `[Hop] Found X crossings on segment` confirming detection worked
3. Console showed `[Hop Arc] Added horizontal arc: A 10 10 0 0 1 450 130` confirming arc commands were generated
4. On failed paths (red dashed), no semicircle bumps were visible

## Root Cause Analysis

Four interconnected issues caused the problem:

### 1. Incorrect SVG Arc Sweep Direction

The SVG arc `sweep-flag` wasn't accounting for SVG's coordinate system where Y increases downward. The original code used `sweep-flag=1` for arcs going right, which caused arcs to curve **downward** (toward larger Y) instead of **upward** (toward smaller Y, away from the page).

### 2. Inconsistent Crossing Detection

Two functions detected crossings differently:
- `checkPathCrossings` used the general `segmentsIntersect` algorithm
- `findCrossingsOnSegment` used specialized orthogonal checks with strict ±1px margins

This inconsistency meant some crossings detected by one function weren't detected by the other.

### 3. Duplicate Arc Generation

When multiple paths crossed at nearly the same point, each crossing generated a separate arc. This created overlapping arcs at single intersection points, with zero-length arcs (from position X to position X) cluttering the path.

### 4. Insufficient Hop Radius

The original `HOP_RADIUS = 6` was too small to see at typical zoom levels (0.5x-1x). The arcs were technically rendering but nearly invisible.

## Solution

### Fix 1: Correct Arc Sweep Direction

```typescript
// BEFORE: Wrong sweep direction
const arcCmd = ` A ${HOP_RADIUS} ${HOP_RADIUS} 0 0 1 ${hopEnd} ${crossing.y}`;

// AFTER: Conditional sweep based on direction
// For horizontal arcs going RIGHT: sweep-flag=0 (counter-clockwise, curves UP)
// For horizontal arcs going LEFT: sweep-flag=1 (clockwise, curves UP)
const arcCmd = ` A ${HOP_RADIUS} ${HOP_RADIUS} 0 0 ${goingRight ? 0 : 1} ${hopEnd} ${segmentY}`;
```

**Key insight**: In SVG coordinates, "upward" means toward smaller Y values. Counter-clockwise (sweep-flag=0) going left-to-right creates an upward arc.

### Fix 2: Unify Crossing Detection

```typescript
function findCrossingsOnSegment(
  segStart: Point,
  segEnd: Point,
  existingPaths: Point[][]
): Point[] {
  const crossings: Point[] = [];

  for (const path of existingPaths) {
    for (let j = 0; j < path.length - 1; j++) {
      const otherStart = path[j];
      const otherEnd = path[j + 1];

      // Use same intersection check as checkPathCrossings
      if (segmentsIntersect(segStart, segEnd, otherStart, otherEnd)) {
        if (sharesEndpoint(segStart, segEnd, otherStart, otherEnd)) {
          continue;
        }

        const intersection = getIntersectionPoint(segStart, segEnd, otherStart, otherEnd);
        if (intersection) {
          crossings.push(intersection);
        }
      }
    }
  }
  // ... sorting and deduplication
}
```

### Fix 3: Deduplicate Nearby Crossings

```typescript
// Deduplicate crossings that are too close (within 2 * HOP_RADIUS)
const deduped: Point[] = [];
for (const crossing of crossings) {
  const tooClose = deduped.some(existing => {
    const dist = Math.abs(dx) > Math.abs(dy)
      ? Math.abs(crossing.x - existing.x)
      : Math.abs(crossing.y - existing.y);
    return dist < HOP_RADIUS * 2;
  });
  if (!tooClose) {
    deduped.push(crossing);
  }
}
return deduped;
```

### Fix 4: Increase Hop Radius

```typescript
// BEFORE
const HOP_RADIUS = 6;

// AFTER
const HOP_RADIUS = 16;
```

## Verification

1. **Visual check**: Enable debug mode, click "Open All Links", verify semicircle bumps appear at crossing points
2. **Console check**: No duplicate arc commands at same position
3. **Direction check**: Horizontal arcs curve upward (away from connection text)

## Prevention Strategies

1. **SVG Arc Direction**: Always test arc rendering visually; sweep-flag behavior is counterintuitive
2. **Algorithm Consistency**: Use a single canonical function for intersection detection
3. **Visibility Testing**: Test visual elements at 0.5x, 1x, and 2x zoom levels
4. **Deduplication**: Add deduplication before generating any repeated visual elements

## Tests

Unit tests for pathfinding utilities are in `src/lib/utils/pathfinding.test.ts`:
- `segmentsIntersect` - line intersection detection
- `getIntersectionPoint` - calculating intersection coordinates
- `pathToSvgWithHops` - SVG arc generation with sweep flags
- `detectCoaxialOverlap` - coaxial segment detection
- `findUsedVerticalChannels` - routing channel detection

Run with `npm test`.

## Commit

```
3a5e55d fix: correct hop-over arc rendering at path crossings
```
