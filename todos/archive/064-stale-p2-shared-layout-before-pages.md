---
status: pending
priority: p2
issue_id: "064"
tags: [code-review, frontend-plan, architecture, simplification]
dependencies: ["063"]
---

# Shared Layout Should Be Created Before Pages, Not Phase 4

## Problem Statement

The plan defers the shared layout (sidebar nav, mobile hamburger) to Phase 4 ("Navigation + Polish"). But Phases 2 and 3 create 6+ new pages that all need navigation. Without a shared layout, each page will either inline duplicate nav markup or have no navigation at all. Phase 4 then becomes a large refactor to extract and deduplicate.

The discover page already has 180 lines of working sidebar + mobile nav. This should be extracted into a layout at the start of Phase 2, not rebuilt from scratch in Phase 4.

## Findings

**Architecture review:** SvelteKit's `(app)/+layout.svelte` group routes are designed for exactly this. Nesting authenticated routes under a group gives them all the shared layout automatically.

**Simplicity review:** Three navigation patterns are proposed (sidebar, hamburger, pill-shaped floating nav). Only two are needed: sidebar+hamburger for the authenticated app, simple top bar for the landing page. The pill-shaped `SiteNav.svelte` is designed for canvas/site viewing and depends on `NavItem` from `load-site-sections.ts` (being deleted). Drop it.

## Proposed Solutions

### Extract layout from discover into (app)/+layout.svelte at start of Phase 2
1. Create `src/routes/(app)/+layout.svelte` with the sidebar/mobile nav from discover
2. Move all authenticated routes under `(app)/`: discover, prompts/*, profile, meetings/*, feedback/*
3. Landing page, login, join, logout, legal pages stay outside the group

- **Effort:** Medium (2-3 hours)
- **Risk:** Low — extracting already-working code

## Acceptance Criteria

- [ ] Shared layout exists before any Phase 2 pages are created
- [ ] All authenticated routes use the shared layout
- [ ] No duplicate nav markup across pages
- [ ] Mobile hamburger works from the shared layout
- [ ] SiteNav.svelte (pill-shaped nav) is NOT adapted — drop it

## Resources

- Existing nav: `src/routes/discover/+page.svelte` lines 139-178
- SvelteKit layout groups: `(group)/+layout.svelte` convention
