---
title: "refactor: Terminology + styling pass — conversation not prompt, Ozge's CSS"
type: refactor
status: completed
date: 2026-03-26
origin: docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md
---

# Terminology + Styling Pass

Replace "prompt" with "conversation" in all user-facing copy. Incorporate Ozge's CSS patterns from the design branches across all pages. The backend model stays "prompt" — this is UI-only.

## Overview

The app is functionally complete (PRs 1-4 merged) but the UI copy uses internal domain vocabulary ("prompt") and the pages lack the polished CSS from Ozge's design work. This PR fixes both: correct the language for end users and apply consistent visual styling.

## User-Facing Copy Inventory

**All instances of "prompt" visible to users. Proposed replacements for review.**

### Landing page (`src/routes/+page.svelte`)

| Line | Current | Proposed |
|------|---------|----------|
| 124 | `"Meet people through conversation in Berlin. Read prompts, pick a time, meet in person."` | `"Meet people through conversation in Berlin. Read, pick a time, meet in person."` |
| 207 | `"No prompts yet. Check back soon."` | `"No conversations yet. Check back soon."` |

### Discover (`src/routes/(app)/discover/+page.svelte`)

| Line | Current | Proposed |
|------|---------|----------|
| 125 | `"No prompts available right now."` | `"No conversations available right now."` |
| 187 | `"No prompts match your filters."` | `"No conversations match your filters."` |
| 192 | `"Start a prompt"` | `"Start a conversation"` |

### Profile (`src/routes/(app)/profile/+page.svelte`)

| Line | Current | Proposed |
|------|---------|----------|
| 30 | `"My prompts"` | `"My conversations"` |
| 60 | `"Start a new prompt"` | `"Start a conversation"` |
| 62 | `"No published prompts."` | `"No published conversations."` |
| 64 | `"No archived prompts."` | `"No archived conversations."` |

### Create page (`src/routes/(app)/prompts/new/+page.svelte`)

| Line | Current | Proposed |
|------|---------|----------|
| 10 | `"New prompt - dyad.berlin"` | `"New conversation - dyad.berlin"` |
| 14 | `"Start a new prompt"` | `"Start a conversation"` |
| 37 | `"Give your prompt a title..."` | `"What would you like to talk about?"` |
| 45 | `"Create prompt"` | `"Create"` |

### Prompt detail (`src/routes/(app)/prompts/[id]/+page.svelte`)

| Line | Current | Proposed |
|------|---------|----------|
| 64 | `"{data.prompt.title ?? 'Prompt'} - dyad.berlin"` | `"{data.prompt.title ?? 'Conversation'} - dyad.berlin"` |
| 105 | `"Only visible to you and the prompt author."` | `"Only visible to you and the author."` |
| 112 | `"What resonates with you about this prompt?"` | `"What resonates with you about this?"` |

### Edit page (`src/routes/(app)/prompts/[id]/edit/+page.svelte`)

| Line | Current | Proposed |
|------|---------|----------|
| 241 | `"{title \|\| 'Edit prompt'} - dyad.berlin"` | `"{title \|\| 'Edit'} - dyad.berlin"` |
| 262 | `"Give your prompt a title..."` | `"What would you like to talk about?"` |
| 348 | `"Publish prompt"` | `"Publish"` |
| 357 | `"Your prompt is live on the discover feed."` | `"Your conversation is live on the discover feed."` |

### URL paths (NO CHANGE)

Routes stay at `/prompts/` — this is internal URL structure, not user-facing copy. Renaming routes would break bookmarks and is unnecessary.

### Style guide alignment (`docs/style-guide.md`)

- Buttons/actions: lowercase (`"create"`, `"publish"`, `"start a conversation"`)
- Headings: Title Case (`"My Conversations"`, `"Start a Conversation"`)
- Badges: Sentence case (`"Draft"`, `"Published"`)

## Styling Implementation

### What to adopt from Ozge's design branches

**Consistent across all pages:**
- [x] Consolidate hardcoded colours into CSS tokens in `app.css`: green success (`#3d9e5a`), red danger (`#c00`), amber saving (`#f59e0b`)
- [x] Standardise border-radius: pills `999px`, cards `12px`, inputs `6px`, thumbnails `6px`
- [x] Standardise hover effects: list items `opacity: 0.72`, buttons `opacity: 0.85`
- [x] Thumbnail pattern: `88px x 96px`, `border-radius: 6px`, `object-fit: cover`, placeholder with `bg-control` background

**Per-page styling improvements:**
- [x] Landing page: already has Ozge's split layout + modals from PR 2. Minor tweaks only.
- [x] Discover page: adopt Ozge's card row styling (thumbnail 88x96, meta row with neighbourhood + dates, snippet 2-line clamp). Currently functional but unstyled compared to design.
- [x] Profile page: adopt card styling with state badges. Current tabs are functional but plain.
- [x] Prompt detail: improve body rendering typography, slot card styling, comment form styling
- [x] Editor page: improve toolbar styling, scheduling section layout
- [x] Meeting detail: improve detail grid styling
- [x] Feedback form: improve tag pill styling, step indicators

### What NOT to adopt (deferred to map view PR)

- FloatingNav component (mobile-first floating pill) — this is the map view's navigation
- SearchOverlay component — search is not in v0.1 scope
- MapView component — separate PR
- Profile header with avatar upload — separate feature
- Public profile page (`@[username]`) — separate feature

## Implementation Steps

### Step 1: CSS token consolidation

`src/app.css`:
- [x] Add `--color-success: #3d9e5a`
- [x] Add `--color-danger: #c00`
- [x] Add `--color-saving: #f59e0b`
- [x] Add `--radius-pill: 999px`
- [x] Add `--radius-card: 12px`
- [x] Add `--radius-input: 6px`

### Step 2: Terminology pass

Apply the copy inventory above across all 6 files. Replace "prompt" with "conversation" or natural language in all user-facing text.

- [x] Landing page (2 instances)
- [x] Discover page (3 instances)
- [x] Profile page (4 instances)
- [x] Create page (4 instances)
- [x] Prompt detail page (3 instances)
- [x] Edit page (4 instances)

### Step 3: Styling pass per page

- [x] Discover: adopt Ozge's card row styling from `feat/v0.1-design-work`
- [x] Profile: improve card and tab styling
- [x] Prompt detail: typography and slot card improvements
- [x] Editor: toolbar and scheduling section
- [x] Meeting detail: detail grid
- [x] Feedback form: tag pills and step layout

### Step 4: Verify

- [x] Build passes
- [x] Tests pass
- [x] All pages visually consistent
- [x] No user-visible "prompt" text remaining (grep check)
- [x] Legal pages still accessible when gated

## Acceptance Criteria

- [x] Zero user-facing instances of the word "prompt" (grep verification)
- [x] CSS tokens consolidated in app.css
- [x] Visual styling consistent across all pages
- [x] Build passes, tests pass
- [x] Copy reviewed and approved by digit

## Sources

- **Ozge's design branches:** `feat/v0.1-design-work`, `feat/v0.1-design-profile`
- **Design principles:** `docs/design/design-principles.md` (inclusive language section)
- **Style guide:** `docs/style-guide.md` (casing conventions)
- **Terminology feedback:** `feedback_conversation_not_prompt_ui.md`
