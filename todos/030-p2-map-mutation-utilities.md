---
status: pending
priority: p2
id: "030"
tags: [code-review, dry, code-quality, canvas-improvements]
---

# 25+ Map Cloning Patterns Should Use Utility Functions

## Problem Statement

The pattern `const newMap = new Map(this.existingMap); newMap.set(k,v); this.existingMap = newMap;` appears 25+ times in canvas.svelte.ts. This is correct for Svelte reactivity but verbose and error-prone.

## Findings

**From Pattern Recognition Reviewer:**

Pattern locations (partial list):
- Lines 371-373: treeLayoutCache
- Lines 475-477: cards in openNote()
- Lines 548-550: dimensionCache
- Lines 599-604: savedCardState
- Lines 897-899: hiddenChains
- Lines 989-991: cards in followLinkToRight()
- Lines 1034-1036: hiddenChains deletion
- Lines 1077-1079: cards in restoreHiddenChain (inside loop!)
- Lines 1131-1133: cards in unopenCard()
- ... ~15 more locations

**Issue in restoreHiddenChain:** The pattern is inside a loop, creating n Map copies for n cards instead of batching.

## Proposed Solutions

### Option A: Create Utility Functions (Recommended)
Extract to reactive-collections.ts utility.

```typescript
// src/lib/utils/reactive-collections.ts
export function updateMap<K, V>(map: Map<K, V>, key: K, value: V): Map<K, V> {
    const newMap = new Map(map);
    newMap.set(key, value);
    return newMap;
}

export function deleteFromMap<K, V>(map: Map<K, V>, key: K): Map<K, V> {
    const newMap = new Map(map);
    newMap.delete(key);
    return newMap;
}

export function updateMapMultiple<K, V>(map: Map<K, V>, entries: [K, V][]): Map<K, V> {
    const newMap = new Map(map);
    for (const [k, v] of entries) {
        newMap.set(k, v);
    }
    return newMap;
}
```

**Pros:** Cleaner code, less error-prone, enables batching
**Cons:** Minor refactor
**Effort:** Medium (2 hours)
**Risk:** Low

### Option B: Use Svelte 5 Proxy Approach
Investigate if Svelte 5's reactivity can track Map mutations directly.

**Pros:** No cloning needed
**Cons:** May not work with current Svelte version
**Effort:** High (research needed)
**Risk:** Medium

## Technical Details

**Files to modify:**
- Create: `src/lib/utils/reactive-collections.ts`
- Edit: `src/lib/stores/canvas.svelte.ts` - use utilities

## Acceptance Criteria

- [ ] Map update utilities created
- [ ] At least 10 usages converted
- [ ] Batch update utility used in restoreHiddenChain
- [ ] All reactivity still works

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
