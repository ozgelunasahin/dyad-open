---
title: "refactor: Editor redesign — clean writing view, publish modal"
type: refactor
status: active
date: 2026-03-26
---

# Editor Redesign

Redesign the prompt editor to match Ozge's design (reference screenshots: `docs/design/photo_2026-03-26_16-06-41.jpg`, `photo_2026-03-26_16-07-32.jpg`, `photo_2026-03-26_16-07-38.jpg`).

## Current vs Target

**Current:** Title input, visible TipTap toolbar (B/I/H1/H2/lists/quote/link), cover image upload link, inline scheduling section, inline publish button.

**Target (from screenshots):**
1. **FloatingNav editor variant** at top: ← Back, • Saved indicator, Continue button
2. **Cover photo placeholder** — dashed border, icon, "Add a cover photo — Required. Click or drag an image." Prominent, not hidden behind a text link.
3. **Large title placeholder** — "Title" in large light serif, no label
4. **@username badge** below title
5. **Clean body editor** — "Start writing..." placeholder, no visible toolbar. Formatting via keyboard shortcuts or inline popup.
6. **"Continue" dropdown** → "Save as Draft" / "Publish as Conversation"
7. **Publish as bottom sheet modal** — "Publish as a Conversation", day picker, time/duration per day, location input, Publish button

## Implementation Steps

### Step 1: FloatingNav editor variant
- [ ] Add `variant="editor"` support to FloatingNav (already in Ozge's original — back button, save indicator, continue button)
- [ ] Wire: back → `/profile`, save status from auto-save, continue → dropdown

### Step 2: Cover photo placeholder
- [ ] Replace the current text link with a dashed-border placeholder box
- [ ] Icon + "Add a cover photo" + "Required. Click or drag an image."
- [ ] Click triggers file input, drag-and-drop support
- [ ] After upload: show the image, click to replace

### Step 3: Clean editor layout
- [ ] Remove the visible toolbar from the edit page (PromptEditor still has it internally — hide it or make it an inline floating toolbar on text selection)
- [ ] Large title placeholder ("Title") — bigger font, lighter color
- [ ] @username badge below title
- [ ] Body editor with "Start writing..." placeholder

### Step 4: Continue dropdown
- [ ] "Continue" button in FloatingNav opens a dropdown/popover
- [ ] Two options: "Save as Draft" (navigates to profile), "Publish as Conversation" (opens publish modal)

### Step 5: Publish as bottom sheet modal
- [ ] Bottom sheet overlay (reuse BottomSheet pattern)
- [ ] "Publish as a Conversation" heading
- [ ] "Pick days, then set time and place for each."
- [ ] 7-day calendar (reuse weekDates pattern)
- [ ] Per-day: time input + duration dropdown + location input
- [ ] "Publish" button
- [ ] Move scheduling logic from inline to this modal

### Step 6: Remove inline scheduling/publish from edit page
- [ ] Remove the current inline scheduling section
- [ ] Remove the inline publish button
- [ ] The edit page becomes purely: cover photo + title + body

## Acceptance Criteria

- [ ] Editor matches reference screenshots
- [ ] FloatingNav editor variant at top with save indicator
- [ ] Cover photo placeholder with drag-and-drop
- [ ] No visible formatting toolbar (clean writing view)
- [ ] Continue → Save Draft / Publish dropdown
- [ ] Publish flow in bottom sheet modal
- [ ] Build passes, tests pass

## Sources

- **Reference screenshots:** `docs/design/photo_2026-03-26_16-06-41.jpg` (empty editor), `photo_2026-03-26_16-07-32.jpg` (draft/publish dropdown), `photo_2026-03-26_16-07-38.jpg` (publish modal)
- **FloatingNav editor variant:** `git show origin/feat/v0.1-design-work:src/lib/components/FloatingNav.svelte` lines 61-76
