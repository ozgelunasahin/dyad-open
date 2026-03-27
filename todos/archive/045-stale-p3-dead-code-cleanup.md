---
status: pending
priority: p3
id: "045"
tags: [code-review, simplicity, dead-code]
---

# Dead Code Cleanup (~870 Lines)

## Problem Statement

The codebase contains approximately 870 lines of dead code across multiple files: archived route files, unused function exports, computed-but-never-read variables, and vestigial backward-compatible parameters.

## Findings

### Code Simplicity Reviewer Agent

**Archive files (822 lines):**
- `src/routes/_archive/page.landing-v1.svelte` (616 lines) — never routed
- `src/routes/_archive/page.server.landing-v1.ts` (206 lines) — never imported

**Unused function exports:**
- `canvas.svelte.ts:693-695` — `openNoteFromIntro()` has zero callers
- `geometry.ts:4-28` — `cardCenter()`, `cardBounds()`, `isHorizontalSegment()`, `isVerticalSegment()` never imported (26 lines)
- `pathfinding.ts:3-4` — `segmentsIntersect` re-export has zero consumers

**Computed-but-never-read variables:**
- `Canvas.svelte:610-616, 1534-1540` — `linkSide` computed in two places, never read (~12 lines)
- `src/lib/types/index.ts:95` — `LinkSide` type used only by dead code

**Vestigial parameters:**
- `canvas.svelte.ts:1223, 1254` — `isCardInReadingZone(_viewportWidth?, _viewportHeight?, _margin?)` and `clearSavedStateIfNotInReadingZone()` accept parameters they explicitly ignore

**Redirect route:**
- `src/routes/discovery/+page.server.ts` — Pure redirect to `/discover/`, should be a Cloudflare `_redirects` rule

## Proposed Solutions

### Option A: Two-pass cleanup (Recommended)
**Pass 1 (zero-risk):** Delete archive files, unused exports, dead variables, unused type. ~870 lines removed.
**Pass 2 (low-risk):** Remove unused parameters from reading zone methods and their call sites.
- **Pros:** Significant LOC reduction, reduces cognitive load
- **Cons:** Requires verification that code is truly unused
- **Effort:** Small-Medium
- **Risk:** Low (verify with grep before each deletion)

## Technical Details

**Affected files:** ~10 files across src/

## Acceptance Criteria

- [ ] All listed dead code removed
- [ ] Build passes with no regressions
- [ ] Each removal verified by grep/search confirming zero callers
