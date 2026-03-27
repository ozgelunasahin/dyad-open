---
title: "feat: Frontend v0.1 Core Journey"
type: feat
status: completed
date: 2026-03-25
origin: docs/brainstorms/2026-03-25-frontend-v01-core-journey-brainstorm.md
---

# Frontend v0.1 Core Journey

Two parallel workstreams: author experience (create/publish prompts) and reader experience (discover/comment/invite/meet/feedback). Plus landing page, profile, and old canvas page removal.

## Overview

The backend for Steps 1-6 is complete with 158 tests. The frontend has one working page (discover feed) and a landing page using legacy canvas data. This plan replaces all canvas-based pages with prompt-domain pages, adds the missing frontend for the full user journey, and adapts the design direction from the design branches.

(see brainstorm: `docs/brainstorms/2026-03-25-frontend-v01-core-journey-brainstorm.md`)

## Technical Approach

### Route Structure

```
/                    — Landing (prompt previews + waitlist for anon; redirect to /discover for auth)
/login               — Login (keep existing)
/join                — Registration via invite (keep existing)
/logout              — Logout (keep existing)
/discover            — Prompt feed (rewrite existing — already uses PromptSummary)
/prompts/new         — Create new prompt (draft)
/prompts/[id]        — Prompt detail (read, comment, invite)
/prompts/[id]/edit   — Edit prompt draft or manage published
/profile             — My prompts, meetings, feedback signals
/meetings/[id]       — Meeting detail (location after acceptance)
/feedback/[id]       — Feedback form (gated by hooks.server.ts)
/impressum           — Keep
/datenschutz         — Keep
/waitlist            — Keep
```

### Design Direction

Adapted from `feat/v0.1-design-work` and `feat/v0.1-design-profile` branches:
- Two navigation patterns: sidebar + hamburger for authenticated app (extracted from existing discover page), simple top bar for landing page. No pill-shaped floating nav (SiteNav is canvas-specific and being removed).
- Card-based prompt listings with thumbnail, title, snippet, neighbourhood, date
- Serif typography (SangBleu Sunrise), beige/neutral palette
- All designs use "prompt" terminology, not "conversation"

### Implementation Phases

#### Phase 0: Remove Old Canvas Pages

Delete canvas-based routes and components that are replaced by the prompt domain model. The canvas module is preserved on `main` for future extraction.

**Prerequisite — Refactor TiptapEditor.svelte BEFORE deletions:**

- [ ] Remove `canvasStore` import from `TiptapEditor.svelte` (line 11) — it imports the canvas store which will be deleted
- [ ] Remove canvas-specific `$effect` blocks: `editFocusPosition` (lines 188-206) and `highlights` decoration (lines 229-252)
- [ ] Remove Wikilink extension registration — wikilinks are a canvas concept, not needed for prompts
- [ ] Verify TiptapEditor compiles and works with reduced extension set (StarterKit, Link, Image)

**Delete routes:**

- [ ] Delete routes: `dashboard/`, `canvas/`, `sites/`, `@[username]/`, `essay/`, `projections/`, `discovery/`

**Delete canvas components:**

- [ ] Delete canvas components: `Canvas.svelte`, `NoteCard.svelte`, `ConnectionLine.svelte`, `SiteSPA.svelte`, `WebsiteContainer.svelte`, `SectionList.svelte`, `SectionCard.svelte`, `ExpandableContent.svelte`, `HighlightPopover.svelte`, `CommentCard.svelte`, `CommentSidebar.svelte`, `MobileReader.svelte`, `MobileReaderPage.svelte`, `FieldNotesSection.svelte`, `HelpBar.svelte`, `MeetingsSection.svelte`, `ConversationCard.svelte`, `JoinGate.svelte`, `RotatingConversationHeadline.svelte`, `MeetingInviteModal.svelte`
- [ ] Extract `FeedbackModal.svelte` interaction logic into `FeedbackForm.svelte` (remove overlay wrapper, keep did-meet/tags/text/submit logic), then delete `FeedbackModal.svelte`. Reused in Phase 3.

**Delete canvas state and utilities:**

- [ ] Delete canvas store: `src/lib/stores/canvas.svelte.ts`
- [ ] Delete canvas utilities: `pathfinding.ts`, `geometry.ts`, `layout.ts`, `pathfinding.test.ts`
- [ ] Delete legacy canvas types from `src/lib/types/index.ts` (keep `JSONContent` re-export if used)

**Delete legacy API routes:**

- [ ] Delete legacy API routes that reference canvas model: `canvas-comments/`, `canvases/`, `highlights/`, `landing-highlights/`, `meeting-feedback/`, `notes/`, `sites/`
- [ ] Delete `api/comments/+server.ts` (old `canvas_comments` table, distinct from `prompt_comments`)
- [ ] Delete `api/follows/+server.ts` (follows not in v0.1 scope)
- [ ] Evaluate `api/bookmarks/+server.ts` and `api/feedback/+server.ts` (legacy bug-report, not meeting feedback) for deletion vs keeping
- [ ] Delete `src/lib/server/load-site-sections.ts`, `src/lib/starter-notes.ts`

**Fix discover page for Phase 0 survival:**

- [ ] Remove `FeedbackModal` import from discover `+page.svelte` (component being deleted)
- [ ] Remove or replace `loadPendingFeedback()` from discover `+page.server.ts` (queries legacy tables)
- [ ] Update discover sidebar links from `/dashboard` to `/profile`

**Keep:**

- [ ] Keep: `TiptapEditor.svelte` (refactored above), `CitySearch.svelte`, `PlaceSearch.svelte`, `MapView.svelte`, `SiteFooter.svelte`, `JoinSection.svelte`
- [ ] Keep: theme store, TipTap extensions, domain logic, services, server utilities
- [ ] Do NOT keep `SiteNav.svelte` — it depends on `NavItem` from `load-site-sections.ts` (being deleted) and is designed for canvas/site viewing, not app navigation

**Verify:**

- [ ] Verify build passes after deletion
- [ ] Verify existing integration tests still pass (they don't touch frontend routes)

#### Phase 1: Landing Page Rewrite + Shared Layout

Replace the canvas-based landing page with prompt data. Create the shared app layout before building any new pages.

**Landing page:**

- [ ] Add migration: anon SELECT policy on `prompts` for `state = 'published'` (see Landing Page Public Access below)
- [ ] Add `getPublishedPromptsPublic(region?, limit?)` to `PromptQueryService` — no `userId` parameter, no author filtering, returns max 6-8 prompts for the landing page
- [ ] Rewrite `src/routes/+page.server.ts`: load published prompts via the new public method using the anon Supabase client. Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` header.
- [ ] Rewrite `src/routes/+page.svelte`: show prompt cards (title, snippet, neighbourhood, date, cover image). Clicking leads to login/waitlist. Keep `JoinSection.svelte` waitlist form. Simple top bar with logo + "Log in" + "Join waitlist" (no sidebar — this is for anonymous visitors).
- [ ] Remove `ConversationData` type dependency
- [ ] Remove admin edit mode for landing highlights (defer to admin tools)

**Shared layout for authenticated routes:**

- [ ] Create `src/routes/(app)/+layout.svelte` — extract sidebar nav + mobile hamburger from discover page's existing 180 lines of working markup. Desktop sidebar (Discover, Profile, sign out) + mobile slide-out panel.
- [ ] Move all authenticated routes under `(app)/` group: `discover/`, `prompts/`, `profile/`, `meetings/`, `feedback/`
- [ ] Landing page, login, join, logout, legal pages stay outside the group
- [ ] Update auth redirects: login → `/discover`, logout → `/`
- [ ] Add gate-status awareness to layout: when user is gated, disable/hide nav links and show feedback prompt

**Gate exemptions:**

- [ ] Add `/impressum` and `/datenschutz` to feedback gate exemption list in `hooks.server.ts` — users must access legal pages regardless of gate state

#### Phase 2: Author Experience

**Prompt Editor — Step 1: Write**

- [ ] Create `src/routes/(app)/prompts/new/+page.server.ts` — SvelteKit form action that creates draft via `POST /api/prompts` and redirects to `/prompts/[id]/edit`. Auth guard via `(app)` layout.
- [ ] Create `src/routes/(app)/prompts/new/+page.svelte` — simple form with submit button (the actual editing happens on the edit page after redirect)
- [ ] Create `src/routes/(app)/prompts/[id]/edit/+page.server.ts` — load prompt, auth guard (must be author)
- [ ] Create `src/routes/(app)/prompts/[id]/edit/+page.svelte` — title input + TipTap body + cover image upload. Auto-save draft with 1.5s debounce (follow TipTap reactive loop prevention pattern). Save status indicator. Lazy-load TipTap editor via dynamic import to keep 150-250KB bundle off non-editor pages.
- [ ] Add `beforeNavigate` guard: if save is pending, flush it before navigating. Add `beforeunload` for tab close.
- [ ] Use generation counter in auto-save to prevent stale save responses from corrupting status (see Auto-Save Pattern below)

**Prompt Editor — Step 2: Schedule + Publish**

- [ ] Add scheduling section below the editor on the same page (not a modal, not a separate route). Rolling 7-day calendar, 1-3 time slots, each with start time + duration + location.
- [ ] Adapt `PlaceSearch.svelte` to return `LocationRef` — 15-line refactor of `buildResult()` to populate `{ place_id, name, address, lat, lng }` instead of `{ exactLocation, postcode }`. Route searches through new `GET /api/locations/search?q=...` endpoint that wraps server-side `searchLocations` (sovereignty: no direct client-to-Nominatim/Photon requests).
- [ ] Publish button: validates title, 1+ slot, all slots have location. Calls `POST /api/prompts/[id]/publish`.
- [ ] Published prompt: show slot management (add/edit/remove via `PATCH /api/prompts/[id]/slots`), unpublish button.

**Profile Page**

- [ ] Create `src/routes/(app)/profile/+page.server.ts` — auth guard, load user's prompts via `GET /api/prompts` and meetings via `GET /api/meetings` in `Promise.all`
- [ ] Create `src/routes/(app)/profile/+page.svelte` — show prompts grouped by state (Draft / Published / Archived). Each card shows title, state badge, date, slot summary. Click navigates to edit (draft) or detail (published/archived). Show upcoming meetings. Archived prompts shown read-only (republish flow deferred).

#### Phase 3: Reader/Engagement Experience + Polish

**Prompt Detail Page**

- [ ] Create `src/routes/(app)/prompts/[id]/+page.server.ts` — auth guard, load prompt detail and comments in `Promise.all` via `GET /api/prompts/[id]` + `GET /api/prompts/[id]/comments`
- [ ] Create `src/routes/(app)/prompts/[id]/+page.svelte` — render `body_html` via `{@html}` (safe: `body_html` only comes from `renderTiptapToHtml()` which applies DOMPurify server-side; NEVER render raw `body` JSON as HTML). Show cover image with `loading="lazy"` + explicit dimensions. Available slots with general area + date, author username.
- [ ] Comment form: textarea, submit via `POST /api/prompts/[id]/comments` (upsert). Show own comment if exists. Show "(edited)" if `updated_at > created_at`. Show privacy indicator: "Only visible to you and the prompt author".
- [ ] Invite flow: select a slot, write optional message, send via `POST /api/prompts/[id]/invitations`. Show confirmation.

**Discover Page Enhancement**

- [ ] Make prompt cards on discover clickable — navigate to `/prompts/[id]`
- [ ] Show "Start a prompt" button linking to `/prompts/new`
- [ ] Add `loading="lazy"` and explicit dimensions to cover images

**Meeting Detail Page**

- [ ] Create `src/routes/(app)/meetings/[id]/+page.server.ts` — auth guard + verify current user is `participant_a` or `participant_b` (defense-in-depth beyond RPC). Load meeting via `GET /api/meetings/[id]`.
- [ ] Create `src/routes/(app)/meetings/[id]/+page.svelte` — show meeting details: scheduled time, duration, general area (or exact location if active meeting), other participant username. Cancel button with browser `confirm()` dialog (cancel reason text input deferred).

**Feedback Form Page**

- [ ] Add `getFormById(formId: string)` to `FeedbackService` interface. Update `GET /api/feedback/[id]` to use the service method instead of direct Supabase query (fixes service-layer bypass).
- [ ] Create `src/routes/(app)/feedback/[id]/+page.server.ts` — auth guard, load form and vocabulary in `Promise.all`. Add `Cache-Control: max-age=3600` to vocabulary API response.
- [ ] Create `src/routes/(app)/feedback/[id]/+page.svelte` — reuse `FeedbackForm.svelte` (extracted from FeedbackModal in Phase 0). Add vocabulary loading from API (replaces hardcoded tags), share-with-person toggle, share-with-platform toggle. Submit via `PATCH /api/feedback/[id]`. Show "waiting for other party" if submitted but not locked. Show revealed feedback if locked.

**Agent-Native API Endpoints**

- [ ] Add `GET /api/prompts/discover` — wraps `getPublishedPrompts()`, returns `PromptSummary[]`. Agents need this to browse the feed.
- [ ] Add `GET /api/gate` — wraps `checkGate()`, returns `{ gated, feedbackFormId }`. Agents need proactive gate checking.
- [ ] Add `GET /api/invitations` — list user's invitations with `?role=inviter|invitee&state=pending` filtering
- [ ] Add `GET /api/invitations/[id]` (GET handler) — invitation detail for participants

**Final Verification**

- [ ] Ensure feedback gate works end-to-end (hooks.server.ts → feedback page → submit → unlock)
- [ ] Test all routes with agent-browser in headed mode
- [ ] Verify no external CDN/API requests from the browser (check network tab)

## Technical Considerations

### TipTap Editor Integration

**CRITICAL**: Follow the pattern from `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`:
- Keep editor content in local `$state`, NOT in a store
- Debounce saves (1.5s) — never save on every keystroke
- Only update server after debounce completes
- Editor content prop must use stable references

### Auto-Save Pattern

Generation counter prevents stale responses from corrupting status. `beforeNavigate` flushes pending saves on navigation.

```typescript
import { beforeNavigate } from '$app/navigation';

let title = $state('');
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveGeneration = 0;
let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

async function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const gen = ++saveGeneration;
  saveStatus = 'saving';
  const res = await fetch(`/api/prompts/${promptId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body: editor?.getJSON() })
  });
  if (gen !== saveGeneration) return; // Superseded by newer save
  saveStatus = res.ok ? 'saved' : 'error';
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveStatus = 'idle';
  saveTimer = setTimeout(saveNow, 1500);
}

// Flush pending saves on navigation
beforeNavigate(async ({ cancel }) => {
  if (saveTimer) {
    cancel();
    await saveNow();
    // Re-navigate programmatically after save completes
  }
});
```

Also add `beforeunload` handler in `onMount` for tab close protection.

### LocationSearch Component

`PlaceSearch.svelte` currently returns `{ exactLocation: string, postcode: string }`. The backend needs `LocationRef { place_id, name, address, lat, lng }`.

**Approach:** Adapt PlaceSearch — 15-line refactor of `buildResult()` to populate all `LocationRef` fields from the Photon response (which already contains geometry coordinates and address data). Do NOT create a new component.

**Sovereignty requirement:** Route searches through a server-side API endpoint (`GET /api/locations/search?q=...&region=berlin`) that wraps `searchLocations` from `location.ts`. Client-side components call this endpoint, not Photon/Nominatim directly. This prevents leaking user IP addresses to external services (per sovereignty lessons #1: "libraries that phone home for runtime assets").

### Landing Page Public Access

The discover feed requires authentication. The landing page needs prompt data for anonymous visitors.

**Approach:** Add a narrow `anon` RLS policy for published prompts only:

```sql
CREATE POLICY "Anonymous can read published prompts"
  ON prompts FOR SELECT TO anon
  USING (state = 'published');
```

Plus a matching policy on `time_slots_public` view for anonymous access to slot data.

**Why not service_role?** A `service_role` client bypasses ALL RLS. Introducing it into production `src/` code (it's currently only in `scripts/` and `tests/`) creates a dangerous pattern — a single developer mistake (reusing the client, storing on `locals`) could expose the entire database. The anon policy grants only SELECT on a single table with a strict WHERE condition. The data is genuinely public.

A new `getPublishedPromptsPublic(region?, limit?)` method on `PromptQueryService` handles the anonymous case — no `userId` parameter, no author filtering, capped at 6-8 prompts for the marketing page.

### Input Validation

- **Upload endpoint:** Validate file magic bytes (first 4-8 bytes) to confirm actual image format, not just client-supplied MIME type. Check for PNG (`\x89PNG`), JPEG (`\xFF\xD8\xFF`), WebP (`RIFF...WEBP`).
- **Prompt body:** Add 100KB size limit for TipTap JSON body. Validate `body.type === 'doc'` structure before storing. This prevents decompression attacks on `renderTiptapToHtml()` and storage abuse via auto-save.
- **`{@html}` rendering:** ONLY render `body_html` from `renderTiptapToHtml()` which applies DOMPurify server-side. NEVER render raw `body` JSON as HTML. The `body_snippet` field is plain text — safe for `{prompt.body_snippet}` without `{@html}`.

## Acceptance Criteria

### Functional Requirements

- [ ] Anonymous visitor sees prompt previews on landing page with join waitlist
- [ ] Authenticated user can create a prompt (title + body + cover image), auto-saved as draft
- [ ] Authenticated user can add 1-3 time slots with location and publish
- [ ] Published prompts appear on discover feed, clickable to detail page
- [ ] User can comment on others' prompts (private to prompt author)
- [ ] User can invite prompt author to meet at a specific slot
- [ ] User can view meeting details with revealed location after acceptance
- [ ] User can cancel meetings with appropriate tier logic
- [ ] User can submit feedback when gated (form shows adjective vocabulary)
- [ ] Profile page shows user's prompts grouped by state + upcoming meetings
- [ ] Old canvas routes are removed — no broken links in the new UI

### Non-Functional Requirements

- [ ] TipTap editor follows reactive loop prevention pattern
- [ ] Auto-save has visible status indicator, generation counter, and navigation guards
- [ ] Shared layout works on mobile (sidebar collapses to hamburger — extracted from discover)
- [ ] No external requests from the browser (sovereignty: no CDN, no direct Nominatim/Photon calls)
- [ ] Comment, invitation, and feedback forms use SvelteKit form actions with `use:enhance`. Auto-save uses client-side `fetch` (progressive enhancement not applicable).
- [ ] TipTap editor lazy-loaded on editor routes only (dynamic import)
- [ ] All `+page.server.ts` loaders with multiple data sources use `Promise.all`
- [ ] Upload endpoint validates file magic bytes, not just MIME header
- [ ] Prompt body size limited to 100KB with structure validation

### Quality Gates

- [ ] Build passes on Cloudflare Pages
- [ ] Existing 158 backend tests still pass
- [ ] All new pages render correctly against local Supabase with seed data
- [ ] Feedback gate tested end-to-end (gate activates → form shows → submit → gate clears)
- [ ] Navigation between all pages works without errors
- [ ] Browser network tab shows zero external requests (sovereignty verification)
- [ ] All authenticated page routes have explicit auth guards
- [ ] Meeting detail page verifies participant identity

## Dependencies

- All backend API endpoints (Steps 1-6) are complete and tested
- Local Supabase infrastructure with seed data is set up
- Design branch patterns reviewed and documented in brainstorm

## Deferred (Not in This Plan)

| Item | Reason |
|------|--------|
| Map view on discover | Requires rebuilding MapView against slot lat/lng data — separate PR |
| Notification display | Step 7 scope (notification service not built yet) |
| Public profile (/@username) | Needs profile query service (Step 7) |
| Account deletion UI | Step 7 scope |
| Admin tools | Step 8 scope |
| PostHog analytics integration | Separate evaluation |
| Republish flow for archived prompts | No users will have archived prompts on day one. Show read-only. Endpoint exists when needed. |
| "Same location for all slots" shortcut | Power user convenience, saves 1-2 clicks. Not needed for v0.1. |
| Cancel meeting with reason text | Simple `confirm()` dialog is sufficient for v0.1. Reason input is a v0.2 enhancement. |
| Rate limiting on prompt-domain APIs | Invite-only user base mitigates risk. Defer to hardening pass. |
| Comment deletion endpoint | Users can overwrite comments (upsert) but not delete. Add `DELETE` in future pass. |

## Sources & References

### Origin

- **Brainstorm:** `docs/brainstorms/2026-03-25-frontend-v01-core-journey-brainstorm.md` — Key decisions: both workstreams in parallel, remove old canvas pages, build on design branches, two-step editor, dedicated prompt detail page.

### Internal References

- TipTap reactive loop: `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`
- Service layer patterns: `docs/solutions/architecture/service-layer-and-test-portability-patterns.md`
- Column-level security: `docs/solutions/security-issues/column-level-access-and-security-definer-patterns.md`
- Design branches: `feat/v0.1-design-work`, `feat/v0.1-design-profile`
- Sovereignty lessons: `docs/solutions/architecture/sovereignty-lessons-learned.md`
- Design principles (inclusive language): `docs/design/design-principles.md`
- v0.1-rc scope: project memory at `project_v01_rc_scope.md`

### Review Findings

Technical review produced 13 todos (059-071). Key changes incorporated:
- P1: TiptapEditor canvasStore refactor before Phase 0, anon RLS instead of service_role, auto-save navigation guards
- P2: Shared layout moved to Phase 1, location search via server proxy, lazy-loaded TipTap, agent-native API endpoints, auth guards on all pages
- Full findings: `todos/059-pending-p1-*` through `todos/071-pending-p3-*`
