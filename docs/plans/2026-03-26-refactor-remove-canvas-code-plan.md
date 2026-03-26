---
title: "refactor: Remove all canvas code"
type: refactor
status: completed
date: 2026-03-26
origin: docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md
---

# Remove All Canvas Code

Phase 0 of the frontend v0.1 plan. Delete all canvas-based routes, components, store, utilities, and legacy API routes. Leave the app in a buildable state with discover, login/join/logout, and a landing page redirect.

## Overview

The `dev` branch has a complete prompt-domain backend (158 tests, Steps 1-6) and one working frontend page (discover feed). The remaining frontend is canvas-based code from `main`. This PR deletes all of it — ~85 files, ~9,000 lines — to clear the ground for the prompt-domain frontend (PRs 2-4). Git history preserves everything.

(see parent plan: `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` Phase 0)

## Implementation Steps

### Step 1: Fix surviving pages

Fix pages that import deleted files or link to deleted routes. Do this BEFORE deleting anything.

**Landing page — replace with redirect or stub:**

`src/routes/+page.server.ts`:
- [x] Replace entire file: auth check → redirect to `/discover`. No canvas queries, no data loading. PR 2 builds the real landing page.

`src/routes/+page.svelte`:
- [x] Replace entire file with a 15-line stub: logo, tagline, "Log in" link → `/login`, "Join waitlist" link → `/waitlist`. PR 2 builds the real landing page.

**Discover page:**

`src/routes/discover/+page.svelte`:
- [x] Remove `import FeedbackModal` (line 4)
- [x] Remove FeedbackModal rendering and `activeFeedback` state (lines 121-131, 181-187)
- [x] Update sidebar links: `/dashboard` → `/profile` (lines 145, 147, 171 — desktop sidebar, admin link, mobile panel)
- [x] Remove Admin link (`/dashboard#admin`) — admin tools are deferred

`src/routes/discover/+page.server.ts`:
- [x] Delete `loadPendingFeedback()` entirely (lines 37-108) — hooks.server.ts gate handles feedback routing
- [x] Remove `pendingFeedback` from returned data

**Join page:**

`src/routes/join/+page.server.ts`:
- [x] Change redirect from `/dashboard` to `/discover` (line 7)

### Step 2: Pre-deletion safety check

Before deleting the notes API, check whether its `validateJSONContent()` function (lines 32-122 of `api/notes/[slug]/+server.ts`) has an equivalent in the prompt domain. It validates TipTap JSON: node type whitelisting, mark type whitelisting, nesting depth limits, dangerous attribute blocking (`onclick`, `onerror`). If the prompt API lacks equivalent validation, extract it to `src/lib/server/validate-tiptap-content.ts` first.

- [x] Verify prompt-domain TipTap content validation exists, or extract `validateJSONContent()` to shared utility

### Step 3: Delete everything

**Routes (28 files):**
- [x] `src/routes/dashboard/` (2 files)
- [x] `src/routes/canvas/` (2 files)
- [x] `src/routes/sites/` (12 files)
- [x] `src/routes/@[username]/` (4 files)
- [x] `src/routes/essay/` (2 files)
- [x] `src/routes/projections/` (1 file)
- [x] `src/routes/discovery/` (1 file)
- [x] `src/routes/_archive/` (2 files)

**Components (27 files) — delete ALL canvas-era components:**
- [x] `Canvas.svelte`, `NoteCard.svelte`, `ConnectionLine.svelte`
- [x] `SiteSPA.svelte`, `WebsiteContainer.svelte`, `SectionList.svelte`, `SectionCard.svelte`
- [x] `ExpandableContent.svelte`, `HighlightPopover.svelte`
- [x] `CommentCard.svelte`, `CommentSidebar.svelte`
- [x] `MobileReader.svelte`, `MobileReaderPage.svelte`
- [x] `FieldNotesSection.svelte`, `HelpBar.svelte`, `MeetingsSection.svelte`
- [x] `ConversationCard.svelte`, `RotatingConversationHeadline.svelte`
- [x] `JoinGate.svelte`, `FeedbackModal.svelte`, `MeetingInviteModal.svelte`
- [x] `SiteNav.svelte` — depends on deleted `load-site-sections.ts`
- [x] `TiptapEditor.svelte` — zero importers, rebuild fresh in PR 3
- [x] `JoinSection.svelte` — zero importers, rebuild in PR 2
- [x] `PlaceSearch.svelte` — zero importers, PR 3 builds location search from scratch (server-side proxy)
- [x] `MapView.svelte` — zero importers, deferred feature
- [x] `SiteFooter.svelte` — zero importers, 33 lines of placeholder

**Keep only:** `CitySearch.svelte` (imported by `/waitlist` route)

**Store, utilities, TipTap extensions (12 files):**
- [x] `src/lib/stores/canvas.svelte.ts` (~2,400 lines)
- [x] `src/lib/utils/pathfinding.ts`, `pathfinding.test.ts`
- [x] `src/lib/utils/geometry.ts`, `layout.ts`
- [x] `src/lib/utils/type-guards.ts` — only imported by deleted files
- [x] `src/lib/utils/slug.ts` — only imported by deleted files
- [x] `src/lib/tiptap/wikilink.ts`, `src/lib/tiptap/highlight-decoration.ts`
- [x] `src/lib/server/load-site-sections.ts`
- [x] `src/lib/starter-notes.ts`

**DO NOT delete:** `src/lib/utils/json-content.ts` — imported by `src/lib/services/prompt-query.ts` for `jsonToPlainText()`. Build breaks without it.

**Keep:** `src/lib/stores/theme.svelte.ts`, `src/lib/utils/tiptap-html.ts` (used by prompt domain). Note: `tiptap-html.ts` contains an inline `WikilinkStatic` extension for backward compatibility with any TipTap JSON containing wikilink nodes — keep it.

**Legacy API routes (17 files):**
- [x] `src/routes/api/canvas-comments/+server.ts`
- [x] `src/routes/api/canvases/[canvasId]/positions/+server.ts`
- [x] `src/routes/api/highlights/+server.ts`
- [x] `src/routes/api/landing-highlights/+server.ts`
- [x] `src/routes/api/meeting-feedback/+server.ts`
- [x] `src/routes/api/notes/+server.ts`, `notes/[slug]/+server.ts`
- [x] `src/routes/api/sites/+server.ts`, `sites/[id]/+server.ts`, `sites/[id]/canvases/+server.ts`, `sites/[id]/pages/+server.ts`, `sites/[id]/pages/[pageId]/+server.ts`
- [x] `src/routes/api/comments/+server.ts` — old `canvas_comments` table
- [x] `src/routes/api/follows/+server.ts`
- [x] `src/routes/api/bookmarks/+server.ts`
- [x] `src/routes/api/feedback/+server.ts` — **FILE ONLY. Do NOT delete the `[id]/` subdirectory** which contains `api/feedback/[id]/+server.ts` (prompt-domain feedback endpoint).

**Types:**

`src/lib/types/index.ts`:
- [x] Remove all canvas types (`Point`, `Note`, `Card`, `Connection`, `Camera`, `Vault`, `ConversationData`, etc.)
- [x] Keep file with comment pointing to `$lib/domain/types.ts`

### Step 4: Clean up dependencies

`package.json`:
- [x] Remove `d3-zoom`, `d3-selection` (zero remaining imports)
- [x] Remove `@types/d3-zoom`, `@types/d3-selection`, `@types/d3-transition` (zero remaining imports)
- [x] Run `npm install` to update lockfile

`vite.config.ts`:
- [x] Update PWA manifest description from "Explore connected notes in space" to prompt-domain branding

### Step 5: Update tests

- [x] Delete `tests/canvas.spec.ts` — tests deleted routes
- [x] Update `tests/auth.setup.ts` line 29: change expected redirect from `/dashboard` to `/discover`

### Step 6: Verify

- [x] `npm run build` passes (Cloudflare adapter)
- [x] `npx svelte-check` — no new errors from this PR
- [x] Integration test suite passes (158 tests)
- [x] Manual check: `/` redirects or shows stub, `/discover` loads, login/join/logout work
- [x] `grep -r "canvasStore\|canvas\.svelte\|NoteCard\|SiteSPA\|load-site-sections" src/` returns zero results

## Acceptance Criteria

- [x] Build passes on Cloudflare Pages
- [x] 158 integration tests pass
- [x] Landing page redirects to `/discover` or shows minimal stub
- [x] Discover page loads without errors, sidebar links point to `/profile`
- [x] `/join` redirects authenticated users to `/discover`
- [x] No imports of deleted files remain in any kept file
- [x] `d3-zoom` and `d3-selection` removed from package.json
- [x] ~85 files deleted, ~9,000 lines removed

## Todos Resolved

- `059-pending-p1-tiptap-canvas-store-dependency.md` — TiptapEditor deleted
- `063-pending-p2-discover-legacy-cleanup-phase0.md` — discover page cleaned up
- `024-p2-remove-dead-pathfinding-code.md` — pathfinding deleted
- `039-pending-p2-expandable-content-no-dompurify.md` — ExpandableContent deleted
- `047-pending-p3-projections-route-public.md` — projections route deleted
- `046-pending-p3-unopen-current-card-duplication.md` — canvas code deleted
- `045-pending-p3-dead-code-cleanup.md` — partially resolved

## Sources

- **Parent plan:** `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` Phase 0
- **Brainstorm:** `docs/brainstorms/2026-03-25-frontend-v01-core-journey-brainstorm.md`
