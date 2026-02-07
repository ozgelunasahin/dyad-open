# CLAUDE.md — Developer Guide

## Project Overview

dyad.berlin is a SvelteKit app for reading interconnected notes on a 2D canvas. Users create canvases with wikilink-connected notes, and publish them as multi-section sites.

**Stack:** SvelteKit, Svelte 5 (runes), Supabase, TipTap/ProseMirror, d3-zoom, Cloudflare Pages.

## Critical Architectural Patterns

### 1. canvasStore is a Singleton

`src/lib/stores/canvas.svelte.ts` exports a single `canvasStore` instance. **You cannot mount two `<Canvas>` components simultaneously** — they share the same store state. The `SiteSPA` component works around this with `suspend()`/`resume()` to snapshot and restore state when switching between canvas sections.

### 2. Map/Set Copy-on-Write for Reactivity

Svelte 5 runes track reactivity by assignment, not mutation. Every `Map` or `Set` mutation **must** create a new instance:

```typescript
// CORRECT
const newCards = new Map(this.cards);
newCards.set(noteId, newCard);
this.cards = newCards;

// WRONG — silently breaks reactivity
this.cards.set(noteId, newCard);
```

This pattern appears dozens of times in `canvas.svelte.ts`. Violating it will silently break the UI.

### 3. initGeneration Guard for Async Races

The store uses a generation counter to prevent stale async work from corrupting state:

```typescript
private initGeneration = 0;

async initialize(vault, canvasId?, savedPositions?) {
    const gen = ++this.initGeneration;
    // ... async work ...
    if (gen !== this.initGeneration) return; // Bail if superseded
}
```

The same pattern appears as `activationGeneration` in `SiteSPA.svelte` and `animationGeneration` in `Canvas.svelte`.

### 4. d3-zoom Cleanup on Unmount

Canvas pan/zoom uses d3-zoom initialized in `Canvas.svelte`'s `onMount`. Cleanup is required:

```typescript
select(svg).on('.zoom', null); // Must be in onMount return/cleanup
```

Without this, ghost event handlers persist after unmount.

### 5. Canvas Lifecycle Methods

- **`teardown()`** — Clears in-memory state only. No API calls. Used for read-only sites.
- **`hardReset()`** — Clears database positions, localStorage, and in-memory state.
- **`suspend()`/`resume()`** — Snapshot/restore canvas state without re-initialization. Used when switching between canvas sections.

### 6. CustomEvent Bus

The store communicates with `Canvas.svelte` via `window.dispatchEvent(new CustomEvent(...))`. Event names are string literals (not centrally typed). Key events: `canvas-focus`, `canvas-compute-paths`, `canvas-zoom-to-fit`, `canvas-open-chain`, `card-content-reflow`. All listeners are cleaned up in `Canvas.svelte`'s unmount.

## Two Site Rendering Approaches

There are two distinct rendering paths for published sites:

1. **Landing page** (`src/routes/+page.svelte`): Uses `buildLandingCanvasData()` to merge all sections into a single flat canvas with `WebsiteContainer` + `Canvas readOnly`.

2. **Paginated SPA** (`SiteSPA.svelte`, used by preview and published sites): Renders sections as scroll-snap pages with individual `Canvas` instances activated/deactivated per section.

The paginated SPA is the newer approach being developed on `feat/paginated-site-view`.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public, works with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Only for `scripts/fetch-feedback.ts` admin script |

## Database

Schema is defined in two places:
- `supabase-setup.sql` — Monolithic setup for fresh projects
- `supabase/migrations/` — Incremental migrations for the Supabase CLI

The migrations directory is the source of truth for the latest schema.

## Project Structure

```
src/
  routes/              # SvelteKit file-based routing
    api/               # REST endpoints (notes, sites, canvases, upload, contact, feedback)
    canvas/[canvasId]/ # Authenticated canvas editor
    dashboard/         # User's canvas list
    sites/             # Site editing, preview, and public rendering
    @[username]/       # Public canvas URLs
  lib/
    components/        # Svelte components (Canvas, NoteCard, SiteSPA, etc.)
    stores/            # canvas.svelte.ts (singleton), theme.svelte.ts
    server/            # Server-only (load-site-sections.ts)
    utils/             # Pure utilities (pathfinding, layout, json-content, etc.)
    tiptap/            # Client-side TipTap wikilink extension
    types/             # TypeScript interfaces and constants
```

## Key Files

- `src/lib/stores/canvas.svelte.ts` — Core state management (~2,400 lines)
- `src/lib/components/Canvas.svelte` — Canvas rendering (~1,700 lines, 870-line onMount)
- `src/lib/components/SiteSPA.svelte` — Paginated site viewer with section navigation
- `src/lib/server/load-site-sections.ts` — Server-side data loading for sites
- `src/lib/utils/pathfinding.ts` — A* pathfinding for connection lines
- `src/lib/utils/tiptap-html.ts` — Server-side TipTap JSON → sanitized HTML

## Build Notes

- PWA workbox warnings about oversized upload files are pre-existing and harmless.
- `svelte-check` has pre-existing errors (Supabase type widening, Cache-Control type).
- `DOMPurify` import: use `import DOMPurify from 'isomorphic-dompurify'` (default import).

## Todos & Plans

The `todos/` directory contains prioritized findings from code reviews. Files follow the pattern `{NNN}-{priority}-{description}.md` with YAML frontmatter. Completed items are in `todos/archive/`.

The `plans/` directory contains implementation plans. Completed plans should be moved to `plans/archive/`.

When resolving a todo or completing a plan, always move the file to the corresponding `archive/` subdirectory rather than deleting it.
