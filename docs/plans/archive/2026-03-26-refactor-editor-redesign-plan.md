---
title: "refactor: Editor redesign — clean writing view + publish modal"
type: refactor
status: active
date: 2026-03-26
origin: docs/brainstorms/2026-03-25-frontend-v01-core-journey-brainstorm.md
---

# Editor Redesign — Clean Writing View + Publish Modal

Redesign the prompt editor to match the design reference screenshots. Replace the current inline scheduling UI with a two-step flow: clean writing view → publish modal. Add FloatingNav editor variant and cover image upload placeholder.

## Overview

The current editor at `/prompts/[id]/edit` has a functional but utilitarian layout: save status text, plain title input, small "Add cover image" link, TipTap with visible toolbar, and inline scheduling rows. The design reference shows a polished, focused writing experience with clear visual hierarchy.

**Design references:**
- `docs/design/ref-editor-empty-mobile.jpg` — FloatingNav (← Back, • Saved, Continue), cover placeholder, Title, @username, "Start writing..."
- `docs/design/ref-editor-draft-publish-mobile.jpg` — With content, Continue dropdown (Save as Draft / Publish as Conversation)
- `docs/design/ref-publish-modal-mobile.jpg` — Bottom sheet: day picker, time+duration, location, Publish button

## Proposed Solution

Restructure the editor page into a clean writing surface with a floating nav bar, and move all scheduling into a bottom sheet publish modal.

### Phase 1: FloatingNav Editor Variant + Clean Writing View

**FloatingNav changes** (`src/lib/components/FloatingNav.svelte`):
- Add `variant` prop: `'discover' | 'editor'` (default `'discover'`)
- Editor variant renders: `← Back` button (left), `• Saved` indicator (center), `Continue` button (right, dark pill)
- Editor variant props: `onBack`, `saveStatus`, `onContinue`
- Keep existing discover variant unchanged

**Editor page layout** (`src/routes/(editor)/prompts/[id]/edit/+page.svelte`):
- [ ] Replace save-status `<div>` with FloatingNav editor variant at top
- [ ] Cover photo upload zone: dashed-border `<button>` with image icon, "Add a cover photo", "Required. Click or drag an image."
  - Click triggers hidden `<input type="file">`
  - Drag-and-drop: `ondragover` must call `e.preventDefault()` (or browser navigates to file)
  - Use drag-enter counter to prevent flickering on child element hover
  - Instant preview via `URL.createObjectURL(file)` (revoke on cleanup)
  - Four visual states: empty (dashed), drag-hover (solid border), preview (image fills zone), error (red border on publish validation failure)
- [ ] When cover uploaded: show cover image preview (full-width, rounded corners), click to change
- [ ] Title: large serif placeholder "Title" (no label, no border), direct binding
- [ ] @username badge below title (from layout data)
- [ ] TipTap editor: hide toolbar entirely — the "Start writing..." placeholder is already implemented via CSS `:first-child::before`
- [ ] Clean body area with no visible border — remove the border/toolbar chrome from PromptEditor

**PromptEditor changes** (`src/lib/components/PromptEditor.svelte`):
- [ ] Add `showToolbar` prop (default `true`)
- [ ] When `showToolbar=false`: hide toolbar div, remove border-radius and top border from editor div
- [ ] Keep toolbar logic intact for future use (markdown shortcuts still work via StarterKit)

### Phase 2: Continue Dropdown + Publish Modal

**Continue dropdown:**
- [ ] "Continue" button in FloatingNav opens a dropdown (not a separate page)
- [ ] Dropdown items: "Save as Draft", "Publish as Conversation"
- [ ] "Save as Draft": flush auto-save, navigate to profile
- [ ] "Publish as Conversation": open publish bottom sheet modal
- [ ] Click outside dropdown closes it (use `setTimeout(0)` or `capture: true` to prevent opening click from immediately closing)
- [ ] Accessibility: WAI-ARIA Menu Button pattern — `aria-haspopup="true"`, `aria-expanded`, `aria-controls` on trigger; `role="menuitem"` on items
- [ ] Keyboard: Enter/Space/ArrowDown opens, Escape closes, ArrowUp/ArrowDown navigates items

**Publish bottom sheet** (new component `src/lib/components/PublishSheet.svelte`):
- [ ] New component (not a BottomSheet variant — content is a form, not a card list)
- [ ] Reuse backdrop + `fly` transition pattern from BottomSheet.svelte
- [ ] `role="dialog"`, `aria-modal="true"`, focus trap (first day button on open, return to Continue trigger on close)
- [ ] Lock body scroll while open (`document.body.style.overflow = 'hidden'`)
- [ ] Backdrop tap with dirty data: show confirmation before discarding (track `isDirty` flag)
- [ ] Visible close button (X) — don't rely solely on backdrop
- [ ] On desktop (>= 768px): render as centered modal instead of bottom-anchored sheet
- [ ] Title: "Publish as a Conversation"
- [ ] Subtitle: "Pick days, then set time and place for each."
- [ ] **Day picker**: 7-day rolling calendar (reuse `weekDates` pattern from discover), multi-select, selected days highlighted black
- [ ] **Per-day slot config**: for each selected day, show:
  - Time dropdown (9:00 AM default, 30-min increments from 7:00 AM to 10:00 PM)
  - Duration dropdown ("for 1 hour" default, options: 30min, 45min, 1hr, 1.5hr)
  - Location search input (Nominatim autocomplete via `/api/locations/search`, same pattern as current editor)
  - "+ add time" link to add additional time on same day
- [ ] Publish button (dark, right-aligned)
- [ ] Validation before publish: title required, cover image required, 1+ slot with location required
- [ ] Error messages for missing fields
- [ ] On publish success: navigate to `/prompts/[id]`

### Phase 3: Cover Image Mandatory Validation

- [ ] Backend: add validation in `POST /api/prompts/[id]/publish` — reject if `cover_image_url` is null
- [ ] Frontend: publish sheet shows error if no cover image
- [ ] Editor: cover placeholder says "Required"
- [ ] Seed script: ensure test data has cover images

## Technical Considerations

### Existing Patterns to Follow
- **Auto-save**: Generation counter pattern already in place (`saveGeneration`). Keep it.
- **TipTap + Svelte 5**: `createSubscriber` bridge already works. Don't change the reactive pattern.
- **Upload API**: `/api/upload` endpoint already handles file upload to Supabase storage. Reuse.
- **Location search**: Debounced Nominatim search with dropdown already implemented inline. Extract into a reusable `LocationSearch` component.
- **BottomSheet**: `fly` transition pattern from `BottomSheet.svelte`. Adapt for form content.
- **FloatingNav**: Pill-shaped floating nav already positioned with `position: fixed`. Add editor variant with same visual language.

### Gotchas from Documented Solutions
- **Svelte 5 + TipTap reactive loop** (`docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`): Never call store methods from `onUpdate`. The current implementation already handles this correctly — don't break it.
- **Copy-on-write for Sets/Maps**: `selectedDays` in the day picker must use `new Set([...prev])` pattern for Svelte 5 reactivity.
- **Navigation guard**: `beforeNavigate` + `beforeunload` pattern already handles unsaved changes. Keep it.

### Extract Shared Utilities
- **`weekDates` computation**: Currently duplicated in discover page, edit page, and FloatingNav date filter. Extract to `src/lib/utils/dates.ts` as `getWeekDates()`.
- **LocationSearch component**: Extract from inline edit page code into `src/lib/components/LocationSearch.svelte` — reused in PublishSheet.

### What NOT to Change
- Auto-save logic (generation counter, debounce timer, navigation guard)
- Upload endpoint
- TipTap extensions (StarterKit, Link, Image)
- Editor layout group `(editor)` structure
- Page server load function

## Files Changed

| File | Change |
|------|--------|
| `src/lib/components/FloatingNav.svelte` | Add `variant='editor'` with back/saved/continue |
| `src/lib/components/PromptEditor.svelte` | Add `showToolbar` prop, clean border styling |
| `src/lib/components/PublishSheet.svelte` | **New** — bottom sheet with day picker + slot config |
| `src/lib/components/LocationSearch.svelte` | **New** — extracted from inline editor code |
| `src/lib/utils/dates.ts` | **New** — `getWeekDates()` shared utility (deduplicate from 3 files) |
| `src/routes/(editor)/prompts/[id]/edit/+page.svelte` | Restructure layout, add cover placeholder, wire FloatingNav + PublishSheet |
| `src/routes/api/prompts/[id]/publish/+server.ts` | Add cover_image_url validation |

## Acceptance Criteria

### Functional
- [ ] FloatingNav editor variant shows ← Back, • Saved, Continue
- [ ] Cover photo placeholder with dashed border, click-to-upload and drag-to-upload
- [ ] Cover image preview shown after upload
- [ ] Title input is large serif with "Title" placeholder
- [ ] @username badge shown below title
- [ ] Body editor has no visible toolbar, "Start writing..." placeholder
- [ ] "Continue" opens dropdown with Save as Draft / Publish as Conversation
- [ ] "Save as Draft" flushes save and navigates to profile
- [ ] "Publish as Conversation" opens bottom sheet modal
- [ ] Day picker: 7-day rolling calendar, multi-select
- [ ] Per-day: time, duration, location with autocomplete
- [ ] Publish validates: title + cover image + 1+ slot with location
- [ ] Publish success navigates to conversation detail
- [ ] Auto-save still works with generation counter
- [ ] Navigation guard still prevents data loss
- [ ] Build passes, no new svelte-check warnings

### Non-functional
- [ ] Editor matches design reference screenshots
- [ ] Bottom sheet has smooth fly-in animation
- [ ] Location search debounced at 250ms
- [ ] Cover upload shows loading state

## Sources & References

- **Origin brainstorm:** `docs/brainstorms/2026-03-25-frontend-v01-core-journey-brainstorm.md` — Section 5: "Prompt editor: two-step flow"
- **Design references:** `docs/design/ref-editor-empty-mobile.jpg`, `ref-editor-draft-publish-mobile.jpg`, `ref-publish-modal-mobile.jpg`
- **Design plan:** `docs/plans/2026-03-26-refactor-design-visual-alignment-plan.md` — Section 5: Editor page
- **Existing editor:** `src/routes/(editor)/prompts/[id]/edit/+page.svelte`
- **TipTap gotcha:** `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`
- **BottomSheet pattern:** `src/lib/components/BottomSheet.svelte`
- **FloatingNav:** `src/lib/components/FloatingNav.svelte`
- **Upload API:** `src/routes/api/upload/+server.ts`
