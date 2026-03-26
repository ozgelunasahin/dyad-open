---
title: "feat: Author experience — prompt editor, scheduling, profile"
type: feat
status: completed
date: 2026-03-26
origin: docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md
---

# Author Experience — Prompt Editor, Scheduling, Profile

PR 3 of the frontend v0.1 plan. Build the pages an author needs: create a prompt, write content, schedule time slots, publish, and view their prompts on a profile page.

## Overview

All backend API endpoints exist and are tested. This PR builds frontend pages under the `(app)/` layout group (auth + sidebar provided by PR 2's layout). Server load functions and form actions call services directly (not via internal API fetch).

(see parent plan: `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` Phase 2)

## Pre-Implementation Fixes

Wire `validateTiptapContent` and add field validation to the existing prompt API endpoints before building new pages. These are pre-existing gaps in the live API.

- [x] Wire `validateTiptapContent()` into `POST /api/prompts` and `PATCH /api/prompts/[id]` — validate `body` before passing to service
- [x] Add `title` validation: max 200 characters, must be string
- [x] Add `cover_image_url` validation: must be null or match expected URL pattern

## Implementation Steps

### Step 1: Build PromptEditor component

Create `src/lib/components/PromptEditor.svelte` — a minimal TipTap wrapper for prompt body editing.

- [x] Props: `content` (JSONContent), `onUpdate` callback, `editable` boolean
- [x] Extensions: StarterKit, Link, Image only
- [x] Use `createSubscriber` from `svelte/reactivity` to bridge TipTap transactions into Svelte 5 reactivity for toolbar state
- [x] `onUpdate` for content changes (triggers auto-save)
- [x] Basic paste handling: URL → auto-link, image paste → upload to `/api/upload`
- [x] Editor CSS: SangBleu Sunrise typography
- [x] Cleanup: `editor.destroy()` on component unmount

### Step 2: Create prompt (draft)

`src/routes/(app)/prompts/new/+page.server.ts`:
- [x] SvelteKit form action calling `SupabasePromptCommandService.create()` directly (not internal fetch)
- [x] On success: `redirect(303, '/prompts/${id}/edit')`
- [x] On error: `fail(400, { error })`

`src/routes/(app)/prompts/new/+page.svelte`:
- [x] Title input + submit button, `use:enhance` for progressive enhancement
- [x] Show validation errors from `form?.error`

### Step 3: Edit prompt + schedule + publish

`src/routes/(app)/prompts/[id]/edit/+page.server.ts`:
- [x] Load prompt via `SupabasePromptQueryService` directly — use `getMyPrompts()` filtered by ID, or a new method. Must verify `author_id === user.id` explicitly (not `getPromptDetail` which returns published prompts to non-authors).
- [x] Return full prompt data including `state` for conditional UI

`src/routes/(app)/prompts/[id]/edit/+page.svelte`:
- [x] Title input + PromptEditor for body
- [x] Cover image: file input + `URL.createObjectURL()` preview → `POST /api/upload` → set `cover_image_url`. Revoke object URL on new selection / unmount.
- [x] Auto-save with 1.5s debounce via `PATCH /api/prompts/[id]`. Generation counter to prevent stale responses (proven pattern from canvasStore's `initGeneration`).
- [x] `beforeNavigate` guard: flush pending save before navigation
- [x] Save status indicator: idle → saving → saved → error

**Scheduling section (below editor, same page):**
- [x] Rolling 7-day date picker (DST-safe `toLocaleDateString('sv-SE')` pattern)
- [x] For each slot: start time input, duration dropdown (30/45/60/90 min), location search
- [x] Location search: adapt `CitySearch.svelte` to call `GET /api/locations/search?q=...` (server proxy) and return `LocationSearchResult`. Add `role="combobox"` and `aria-expanded` attributes. Existing keyboard handling (arrow keys, enter, escape) is sufficient for v0.1.
- [x] `GET /api/locations/search` endpoint: auth guard, min 2 chars, max 200 chars, delegates to `searchLocations()` from `location.ts`
- [x] Add slot / remove slot buttons (max 3)
- [x] **Publish button**: must flush pending auto-save first (`await saveNow()`), then validate title + 1 slot + locations, then call `POST /api/prompts/[id]/publish`
- [x] After publish: show slot management (edit/remove slots), unpublish button

### Step 4: Profile page

`src/routes/(app)/profile/+page.server.ts`:
- [x] Load prompts via `SupabasePromptQueryService.getMyPrompts()` and meetings via `SupabaseMeetingService.getMyMeetings()` in `Promise.all`

`src/routes/(app)/profile/+page.svelte`:
- [x] Local `$state` tab for Draft / Published / Archived (no URL sync — not needed for v0.1)
- [x] Show count in tab labels: "Drafts (3)"
- [x] Each card: title, state badge, date, slot count
- [x] Click: draft → `/prompts/[id]/edit`, published/archived → `/prompts/[id]` (PR 4)
- [x] Upcoming meetings section
- [x] Empty state per tab

### Step 5: Verify

- [x] Build passes
- [x] All tests pass
- [x] Full author flow: create → write → schedule → publish
- [x] Published prompt appears on discover feed
- [x] Auto-save works (edit, wait 1.5s, reload → content persisted)
- [x] Navigation away with pending save flushes correctly
- [x] Publish flushes pending save before proceeding
- [x] Profile shows prompts grouped by state

## Technical Considerations

### TipTap + Svelte 5 Reactivity

Use `createSubscriber` from `svelte/reactivity`:

```typescript
import { createSubscriber } from 'svelte/reactivity';

const subscribe = createSubscriber((update) => {
  editor.on('transaction', update);
  return () => editor.off('transaction', update);
});

let isBold = $derived.by(() => {
  subscribe();
  return editor?.isActive('bold') ?? false;
});
```

### Auto-Save Pattern

Generation counter (proven in codebase via `initGeneration`):

```typescript
let saveGeneration = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

async function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const gen = ++saveGeneration;
  saveStatus = 'saving';
  const res = await fetch(`/api/prompts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body: editor?.getJSON() })
  });
  if (gen !== saveGeneration) return;
  saveStatus = res.ok ? 'saved' : 'error';
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveStatus = 'idle';
  saveTimer = setTimeout(saveNow, 1500);
}
```

### Publish Must Flush Save

```typescript
async function handlePublish() {
  // Flush any pending auto-save first
  await saveNow();
  // Then publish
  const res = await fetch(`/api/prompts/${id}/publish`, { ... });
}
```

### beforeNavigate Guard

```typescript
import { beforeNavigate, goto } from '$app/navigation';

beforeNavigate((navigation) => {
  if (!saveTimer) return;
  if (navigation.willUnload) { navigation.cancel(); return; }
  navigation.cancel();
  saveNow().then(() => {
    if (navigation.to?.url) goto(navigation.to.url.pathname);
  });
});
```

## Acceptance Criteria

- [x] Build passes
- [x] Tests pass
- [x] Full author flow: create → write → schedule → publish
- [x] Auto-save with generation counter, status indicator, navigation guards
- [x] Publish flushes pending save before proceeding
- [x] Profile shows Draft / Published / Archived tabs
- [x] Location search via server proxy (adapted CitySearch)
- [x] `validateTiptapContent` wired into prompt API endpoints
- [x] Title and cover_image_url validated in API endpoints
- [x] Edit page verifies current user is author

## Sources

- **Parent plan:** `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` Phase 2
- **TipTap pattern:** `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`
- **Service layer:** `docs/solutions/architecture/service-layer-and-test-portability-patterns.md`
- **External research:** TipTap 3.x `createSubscriber` for Svelte 5 reactivity, SvelteKit `beforeNavigate` API, ARIA combobox pattern
