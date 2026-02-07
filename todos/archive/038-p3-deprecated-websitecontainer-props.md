---
status: pending
priority: p3
id: "038"
tags: [code-review, code-quality]
---

# Deprecated WebsiteContainer Props Not Fully Migrated

## Problem Statement

`src/lib/components/WebsiteContainer.svelte` has `@deprecated` props `canvases` and `currentCanvas` (lines 18-20) with backward-compat merging logic. Two call sites still use the old prop names.

## Findings

Call sites using old names:
- `src/routes/sites/@[username]/[canvas]/+page.svelte` (lines 47-48)
- `src/routes/sites/@[username]/[site]/[canvas]/+page.svelte` (lines 33-34)

## Proposed Solution

Update call sites to use `navItems` and `currentItem`, then remove the deprecated props and compat logic.

**Effort:** Small (15 min)
**Risk:** Low

## Acceptance Criteria

- [ ] Call sites use `navItems` and `currentItem`
- [ ] Deprecated props removed from WebsiteContainer
- [ ] Backward-compat logic removed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-06 | Created from hand-off review | |
