---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, architecture, duplication]
dependencies: []
---

# Canvas Page Duplication (500+ Lines CSS Duplicated)

## Problem Statement

Two canvas page components share ~80% identical code with 400+ lines of duplicated CSS:
- `src/routes/canvas/[canvasId]/+page.svelte` (933 lines)
- `src/routes/[username]/[canvasSlug]/+page.svelte` (330 lines)

## Findings

### Architecture Strategist & Pattern Recognition Agents

**Duplicated elements**:
- Vault loading logic (`onMount` fetch pattern)
- Keyboard navigation handlers
- Loading/error states
- Canvas component rendering
- Navigation controls CSS
- Modal styles
- Theme toggle styles

## Proposed Solutions

### Option A: Extract Shared Component (Recommended)
- **Description**: Create `CanvasView.svelte` with `isOwner` prop for conditional controls
- **Pros**: Single source of truth, maintainable
- **Cons**: Requires refactoring
- **Effort**: Medium
- **Risk**: Low

### Option B: Extract Shared CSS Module
- **Description**: Move common styles to shared CSS file
- **Pros**: Smaller change
- **Cons**: Still leaves duplicated JS logic
- **Effort**: Small
- **Risk**: Low

## Recommended Action

**Option A** - Full component extraction. Better long-term maintainability.

## Acceptance Criteria

- [ ] Shared CanvasView component created
- [ ] Owner-only controls conditional on `isOwner` prop
- [ ] No CSS duplication between routes
- [ ] Both routes function correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by architecture and pattern agents |
