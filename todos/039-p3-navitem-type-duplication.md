---
status: pending
priority: p3
id: "039"
tags: [code-review, code-quality, types]
---

# NavItem Type Defined Twice with Different Shapes

## Problem Statement

`NavItem` is defined in two locations with different fields:

1. `src/lib/server/load-site-sections.ts` (lines 7-13): Has `type`, `slug`, `name`, `cardId`
2. `src/lib/components/SiteSPA.svelte` (lines 11-15): Has `slug`, `name`, `type` (as loose `string`)

The SiteSPA version lacks `cardId` and uses a looser `type: string` instead of the union.

## Proposed Solution

Import the server-side `NavItem` type in SiteSPA instead of redefining it, or move the type to `$lib/types/index.ts`.

**Effort:** Small (15 min)
**Risk:** Low

## Acceptance Criteria

- [ ] Single `NavItem` type definition
- [ ] Both locations use the same type

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-06 | Created from hand-off review | |
