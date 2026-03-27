---
status: pending
priority: p3
id: "046"
tags: [code-review, simplicity, dry]
---

# unopenCurrentCard() Duplicates unopenCard() Logic

## Problem Statement

`unopenCurrentCard()` in `canvas.svelte.ts` (lines 1792-1860) is 68 lines that manually re-implement card closing logic already present in `unopenCard()`. It does not handle descendants or hidden chains (which `unopenCard` does), creating a subtle behavioral inconsistency.

## Findings

### Code Simplicity Reviewer Agent

- `canvas.svelte.ts:1792-1860` — 68-line method duplicating close logic
- Does not call `closeCardWithoutRecursion()` or `unopenCard()`
- Missing hidden chain handling that `unopenCard` provides
- Could be reduced to ~5 lines delegating to `unopenCard(this.focusedCardId)`

## Proposed Solutions

### Option A: Delegate to unopenCard (Recommended)
Replace body with guard check + `this.unopenCard(this.focusedCardId)` + `this.exitLinkFocusMode()`.
- **Pros:** ~60 lines saved, fixes hidden chain bug, single card-closing path
- **Cons:** Must verify behavioral equivalence
- **Effort:** Small
- **Risk:** Low-Medium (test navigation carefully)

## Technical Details

**Affected files:**
- `src/lib/stores/canvas.svelte.ts`

## Acceptance Criteria

- [ ] `unopenCurrentCard()` delegates to `unopenCard()`
- [ ] Card closing behavior unchanged for the user
- [ ] Hidden chains properly handled in both code paths
