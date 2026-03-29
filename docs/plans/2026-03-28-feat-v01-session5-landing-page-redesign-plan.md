---
title: "feat: v0.1 Session 5 — Landing Page Redesign"
type: feat
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
deepened: 2026-03-28
---

# v0.1 Session 5: Landing Page Redesign

Replace the right-side conversation card list with the full discover view (map + list toggle) for anonymous visitors. All pin/card clicks open a waitlist/login dialog instead of navigating. The landing page becomes a window into the real community — real conversations, real locations, real words.

(see brainstorm: `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — Session 5; readiness plan S9 + S12 landing page items)

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** best-practices-researcher, security-sentinel, architecture-strategist, code-simplicity-reviewer, performance-oracle

### Key Improvements from Research
1. **Single `AuthDialog` with mode toggle** — merge waitlist + login into one `<dialog>` component with `mode: 'waitlist' | 'login'` (proven pattern from existing login page's mode switching)
2. **Cross-route form action needs `applyAction`** — default `use:enhance` doesn't update form props across routes. Handle redirect with `goto()`, failure with inline error.
3. **HIGH security fix required**: `GRANT ALL ON profiles TO anon` exposes full profile table. Must restrict to column-level `GRANT SELECT (id, username)` before landing page ships.
4. **Default to list view** — Leaflet loads only on map toggle via `{#if}` conditional rendering. Best TTI for public-facing page.
5. **`<dialog>` top layer beats all z-index** — native `showModal()` renders above Leaflet, BottomSheet, FloatingNav. No z-index tuning needed.

### New Considerations Discovered
- BottomSheet must render `<button>` not `<a>` when intercepting clicks (accessibility)
- Extract `PromptListItem` component from discover's inline markup to avoid duplication
- Segmented control (`role="radiogroup"`) for view toggle, not tabs or icon buttons
- `expression_url` in `/api/contact` has no validation (stored XSS risk if rendered in admin)
- CDN cache should set `Vary: Cookie` to prevent serving authenticated redirect to anonymous users

## Why This Matters

From the user archetypes: Jackson asks "who's here?", Deniz wants to see real people not polished marketing, Miri needs to feel the platform isn't about intellectualising. The landing page IS the answer — showing the actual discover feed with map pins, real conversation titles, real neighbourhoods.

## Prerequisites

- **Session 3a merged** (PR #65) — FloatingNav, sidebar hidden, RLS safeguarding
- **Session 3b** (PR #66) — discover visibility changes, map distance filter. Can proceed in parallel (separate code path via `getPublishedPromptsPublic()`)
- **Anon RLS policies** — already exist (`20260402_anon_published_prompts.sql`)

## Pre-Session Security Fix

**Finding (HIGH):** `GRANT ALL ON profiles TO anon` in baseline migration exposes full profile table — usernames, `referred_by` (social graph), `berlin_based`, `can_publish_sites` (admin flag), timestamps. Any anonymous user can query all profiles via direct Supabase REST API.

- [ ] New migration: `REVOKE ALL ON profiles FROM anon; GRANT SELECT (id, username) ON profiles TO anon;`
- [ ] Verify `buildUsernameMap` in `src/lib/server/username-lookup.ts` still works with restricted columns
- [ ] Also validate `/api/contact` input: add length limits for `expression_url` (2048), `referred_by_username` (100), `based_in` (200). Validate `expression_url` starts with `https://`.

## Architecture Decisions

### 1. Single AuthDialog with mode toggle (not two modals)

The login page (`/login`) already uses a `mode` state variable to switch between `login`, `reset`, and `update` forms. Follow the same pattern: one `AuthDialog.svelte` with `mode: 'waitlist' | 'login'`. One `<dialog>`, one set of open/close logic, one backdrop. The "Already have an account?" / "Join" links toggle `mode` instantly — no flash of closing/opening dialogs.

**Cross-route form action pattern for login mode:**
```typescript
// Custom use:enhance handler for login form (action="/login?/login")
function handleEnhance() {
  loading = true;
  return async ({ result }) => {
    loading = false;
    if (result.type === 'redirect') {
      hide();
      await goto(result.location, { invalidateAll: true });
    } else if (result.type === 'failure') {
      error = result.data?.error ?? 'Login failed';
      // Do NOT call applyAction — wrong page context
    }
  };
}
```

**Waitlist mode:** Simple `fetch('POST', '/api/contact')` — no form action needed.

### 2. Landing page stays at root route

Current `src/routes/+page.svelte` is outside all route groups. No sidebar (correct for anonymous page). No change needed. The sidebar lives in `(app)/+layout.svelte` and only renders for authenticated routes.

### 3. BottomSheet click interception via `onCardClick` prop

Add optional `onCardClick?: (promptId: string) => void` to BottomSheet. When provided, render `<button>` (not `<a>`) — an anchor that doesn't navigate is an accessibility violation. The landing page passes a handler that opens the AuthDialog in waitlist mode.

### 4. Default to list view, conditional map rendering

Use `{#if viewMode === 'map'}` (same pattern as discover page line 139). Leaflet JS (~40KB gzipped) + tiles (~250KB) load only when user toggles to map. Default list view renders with zero Leaflet overhead.

## Items

### 1. Pre-session: profiles anon grant restriction + contact API validation

- [ ] `supabase/migrations/YYYYMMDD_restrict_profiles_anon.sql` — `REVOKE ALL ON profiles FROM anon; GRANT SELECT (id, username) ON profiles TO anon;`
- [ ] `src/routes/api/contact/+server.ts` — add length limits: `expression_url` (2048, validate `https://`), `referred_by_username` (100), `based_in` (200)

### 2. Landing page layout — embed discover view

**Current:** Split-screen: hero left, ConversationCard list right. Desktop `grid: 1fr 1fr`. Mobile stacks.

**Change:** Replace right column with discover view (list default, map toggle). Reuse MapView and BottomSheet directly. Extract `PromptListItem` component from discover page's inline list markup to share between discover and landing page.

- [ ] Extract `src/lib/components/PromptListItem.svelte` from discover page inline markup (lines 168-194). Support `onclick` / `href` dual pattern (like ConversationCard).
- [ ] `src/routes/+page.svelte` — replace ConversationCard list with discover view
- [ ] Segmented control for map/list toggle: `role="radiogroup"`, monospace font, `--border-link`, `--radius-input`. Independent from FloatingNav (no filter/search/auth links).
- [ ] Map: render MapView inside `{#if viewMode === 'map'}` (conditional, not CSS hidden)
- [ ] List: render PromptListItem rows with `onclick` → open AuthDialog
- [ ] BottomSheet for pin clicks with `onCardClick` → open AuthDialog
- [ ] Mobile: hero stacked above discover view. Map height: `min(40vh, 320px)` — preview, not workspace.
- [ ] Store map center/zoom in component state for restoration on toggle (same as discover page pattern)
- [ ] Preserve `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- [ ] Add `Vary: Cookie` to response headers (prevent CDN caching auth redirect for anon users)

### 3. AuthDialog — single component, two modes

- [ ] Create `src/lib/components/AuthDialog.svelte` — native `<dialog>` with `showModal()`
- [ ] `mode: 'waitlist' | 'login'` state, toggled by "Already have an account?" / "Join" links
- [ ] **Waitlist mode:** freewrite textarea (required), name input (optional), city input (optional, plain `<input>` — CitySearch autocomplete adds complexity for an optional field), email input (required). Submit via `fetch('POST', '/api/contact')`.
- [ ] **Login mode:** email + password. `<form action="/login?/login" use:enhance={handleEnhance}>`. Handle redirect with `goto()`, failure with inline error.
- [ ] On waitlist success: show inline confirmation, manual close (no auto-timer)
- [ ] "Forgot password?" → navigates to `/login?mode=reset` (route, not modal)
- [ ] Dismiss: backdrop click, Escape, X button
- [ ] Accessibility: `aria-label`, focus trap (native), `<button>` for close

### 4. Click interception — all clicks open AuthDialog

- [ ] `src/lib/components/BottomSheet.svelte` — add `onCardClick?: (promptId: string) => void` prop. Render `<button>` when provided, `<a>` when not.
- [ ] Landing page: all card clicks, pin clicks, and "Join waitlist" button open AuthDialog in waitlist mode
- [ ] "Log in" link opens AuthDialog in login mode

### 5. "Private beta" label + button repositioning

- [ ] "Private beta" label (monospace, `--text-xs`, muted)
- [ ] "Log in" moved near hero CTA area (not hidden top-right)
- [ ] Both "Join waitlist" and "Log in" open the AuthDialog in their respective modes

## Tensions and Open Questions

1. **Modal vs route tension:** Solution doc warns against inline forms. This AuthDialog is deliberately lightweight (waitlist: 4 fields + fetch; login: 2 fields + form action). If it exceeds ~80 lines of template or introduces 2+ imports the landing page doesn't need, extract back to routes. The `/waitlist` and `/login` routes continue to exist for direct links.

2. **Login form action redirect:** The `use:enhance` custom handler with `goto()` should work, but test the flow end-to-end. If the redirect is unreliable, fall back to client-side `supabase.auth.signInWithPassword()` (simpler but loses progressive enhancement).

3. **Map as default view:** The plan defaults to list for performance. If the design intent is map-first (show Berlin spatially), accept the ~300ms Leaflet load on map mount. Document the decision.

4. **CitySearch in waitlist:** Simplified to plain `<input>` for the modal. If city autocomplete matters for data quality, add CitySearch back later. The city field is optional.

5. **Snapshot state:** The discover page uses SvelteKit snapshots for map state. The landing page modals don't navigate away (they're `<dialog>` overlays), so map state is preserved automatically while the dialog is open. Snapshots only needed if users navigate to `/waitlist` or `/login` routes directly and come back.

## Acceptance Criteria

- [ ] Profiles anon grant restricted to `(id, username)` columns only
- [ ] Contact API validates `expression_url`, `referred_by_username`, `based_in` lengths
- [ ] Anonymous visitors see discover view (list default, map toggle) on landing page
- [ ] Map renders only when toggled (no Leaflet overhead on list view)
- [ ] Pin click → BottomSheet → card click → AuthDialog (waitlist mode)
- [ ] List card clicks → AuthDialog (waitlist mode)
- [ ] AuthDialog: waitlist mode submits to `/api/contact`, login mode authenticates and redirects
- [ ] "Already have an account?" / "Join" toggle between modes without closing dialog
- [ ] "Private beta" label visible, "Log in" accessible near hero
- [ ] Authenticated users still redirect to `/discover`
- [ ] `/waitlist` and `/login` routes still work independently
- [ ] BottomSheet renders `<button>` (not `<a>`) when `onCardClick` is provided
- [ ] Mobile: hero above discover, map at `min(40vh, 320px)`
- [ ] No SSR errors from Leaflet
- [ ] `PromptListItem` shared between discover and landing pages

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 5
- **Readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — S9 (waitlist modal), S12 (landing page discover embed + login modal)
- **Design principles:** [docs/design/design-principles.md](docs/design/design-principles.md) — modals fine when they keep user in context (not interrupting modals)
- **User archetypes:** [docs/design/user-archetypes.md](docs/design/user-archetypes.md) — Jackson, Deniz, Miri

### Solution Docs Applied
- `docs/solutions/ux-patterns/extract-inline-modals-to-routes.md` — tension acknowledged, lightweight forms acceptable inline, escape hatch documented
- `docs/solutions/integration-issues/leaflet-sveltekit-ssr-cleanup-zindex.md` — dynamic import in onMount, z-index tiers (moot for `<dialog>` top layer)
- `docs/solutions/ux-patterns/map-state-preservation-with-sveltekit-snapshots.md` — store center/zoom for toggle restoration

### Review Agents
- **Best practices:** `applyAction` pattern for cross-route form actions, segmented control for toggle, `$effect` bridge for dialog open/close sync
- **Security sentinel:** HIGH: profiles `GRANT ALL` to anon. MEDIUM: `expression_url` no validation. PASS: CSRF protected, auth guard solid, cache data appropriate
- **Architecture strategist:** BottomSheet must use `<button>` not `<a>` for intercepted clicks. Extract `PromptListItem`. FloatingNav must NOT be imported (has auth-gated links). Sidebar correctly absent (root route, not `(app)` group).
- **Simplicity reviewer:** Merge modals into single AuthDialog. Cut booked/available status (YAGNI). 40vh mobile map. Plain input for city. No auto-close timer.
- **Performance oracle:** Default list view for TTI. Conditional `{#if}` rendering for map. CitySearch is lightweight. Cache-Control adequate. Store map state in component state for toggle.
