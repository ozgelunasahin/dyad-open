---
status: pending
priority: p2
id: "043"
tags: [code-review, architecture, typescript]
---

# Shared Types Live in Wrong Modules (Server/Client Boundary Violation)

## Problem Statement

Client components import types from `$lib/server/load-site-sections.ts`, and server code imports `SavedPosition` from the client-side store `$lib/stores/canvas.svelte.ts`. While these are type-only imports (erased at build time), they create conceptual layering violations.

## Findings

### Architecture Strategist Agent

**Client importing from server:**
- `SiteSPA.svelte:9` imports from `$lib/server/load-site-sections.ts`
- `SiteNav.svelte:3` imports from `$lib/server/load-site-sections.ts`
- `WebsiteContainer.svelte:2` imports from `$lib/server/load-site-sections.ts`

**Server importing from client:**
- `load-site-sections.ts:3` imports `SavedPosition` from `$lib/stores/canvas.svelte`

## Proposed Solutions

### Option A: Move shared types to $lib/types/ (Recommended)
Move `SectionData`, `NavItem`, `CanvasSectionData`, `HtmlSectionData`, `SavedPosition` into `$lib/types/index.ts` or a new `$lib/types/site.ts`.
- **Pros:** Clean layering, types at the contract boundary where they belong
- **Cons:** Updating imports across ~5 files
- **Effort:** Small
- **Risk:** Low

## Technical Details

**Affected files:**
- `src/lib/server/load-site-sections.ts` (export types, update import)
- `src/lib/stores/canvas.svelte.ts` (export SavedPosition, update import)
- `src/lib/types/index.ts` or new `src/lib/types/site.ts`
- 3 client components (update imports)

## Acceptance Criteria

- [ ] No client component imports from `$lib/server/`
- [ ] No server module imports from `$lib/stores/`
- [ ] All shared types live in `$lib/types/`
