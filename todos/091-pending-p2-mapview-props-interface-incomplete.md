---
status: pending
priority: p2
issue_id: "091"
tags: [code-review, typescript, type-safety]
dependencies: []
---

# MapView Props interface missing 3 properties

## Problem Statement

MapView.svelte declares a `Props` interface with only `prompts` and `onSelectPin`, but destructures 3 additional props (`initialCenter`, `initialZoom`, `onMoveEnd`) that are implicitly `any`. Callers get zero type checking on these.

## Fix

Add to the Props interface:
```typescript
initialCenter?: [number, number];
initialZoom?: number;
onMoveEnd?: (center: [number, number], zoom: number) => void;
```

## Affected Files
- `src/lib/components/MapView.svelte:6-11`
