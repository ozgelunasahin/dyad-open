---
title: "refactor: Visual alignment with design reference"
type: refactor
status: active
date: 2026-03-26
---

# Visual Alignment with Design Reference

Align the current app with the design reference screenshots taken from the running design branches. Based on actual screenshots in `docs/design/ref-*.png/jpg`.

## Reference Screenshots

| File | Shows |
|------|-------|
| `ref-discover-mobile-with-data.png` | FloatingNav TOP, conversation cards with thumbnails |
| `ref-profile-mobile-with-data.png` | FloatingNav BOTTOM, profile header + 2×2 action cards |
| `ref-discover-desktop.png` | Sidebar + empty content |
| `ref-profile-desktop.png` | Sidebar + profile header + action cards |
| `ref-conversation-detail-mobile.jpg` | Cover image, author+date, title, body, action bar |
| `ref-editor-empty-mobile.jpg` | FloatingNav editor variant, cover placeholder, title, body |
| `ref-editor-draft-publish-mobile.jpg` | Save as Draft / Publish dropdown |
| `ref-publish-modal-mobile.jpg` | Bottom sheet publish with day picker + time + location |
| `ref-map-mobile.jpg` | Full screen map with dark circle pins |

## Changes by Page

### 1. FloatingNav improvements

Current: map icon, calendar icon, spacer, + button, profile icon
Design: map icon, calendar icon, **Search bar** (expanding pill), + button, profile icon

- [ ] Replace the spacer with a search pill (visual only for now — search not functional in v0.1, but the pill should be there as a placeholder)
- [ ] FloatingNav position varies by page: TOP on discover, BOTTOM on profile
- [ ] Add `position` prop already exists — ensure discover passes `position="top"` and profile passes `position="bottom"`

### 2. Discover page

Current is close to design. Remaining gaps:
- [ ] Card thumbnails should be square with rounded corners (currently close, verify sizing matches 88×96px)
- [ ] Location text showing below title (neighbourhood name) — verify formatting matches
- [ ] Date range showing in the card (e.g. "20 Fri · 22 Sun") — currently shows soonest date only

### 3. Profile page — major rework

Current: simple tabs (Drafts/Published/Archived) with text list
Design: profile header card + 2×2 action card grid

- [ ] Profile header card: avatar placeholder (initial letter), display name, @username, stats (Active count, Meetings count, Saved count)
- [ ] 2×2 action card grid: Conversations (with green active dot), Meetings, Archive, (Bookmarks — defer, not in v0.1)
- [ ] Each action card shows stacked thumbnail placeholders
- [ ] Click card → filtered view (conversations shows user's prompts, meetings shows meetings, etc.)
- [ ] FloatingNav at bottom with `position="bottom"`

### 4. Conversation detail page

Current: title, author, body, slots, response form
Design reference (`ref-conversation-detail-mobile.jpg`):
- [ ] Full-width cover image at top (edge to edge)
- [ ] @author + date below image (monospace for author, serif for date)
- [ ] Title in large serif
- [ ] Body text
- [ ] Bottom action bar: bookmark (defer), response count with icon, "invite to meet" button, share (defer)

### 5. Editor page

Current: title input, TipTap with toolbar, inline scheduling
Design reference (`ref-editor-empty-mobile.jpg`, `ref-editor-draft-publish-mobile.jpg`, `ref-publish-modal-mobile.jpg`):
- [ ] FloatingNav editor variant at top: ← Back, • Saved indicator, Continue button
- [ ] Cover photo: dashed-border placeholder ("Add a cover photo — Required"), click/drag to upload
- [ ] Title: large serif placeholder, no label
- [ ] @username badge below title
- [ ] Clean body: "Start writing..." placeholder, no visible toolbar
- [ ] "Continue" opens dropdown: "Save as Draft" / "Publish as Conversation"
- [ ] "Publish" opens bottom sheet modal: day picker, time+duration per day, location, Publish button

### 6. Map view

Current: full screen map with dark dots + fuzzy circles, cover image markers
Design reference (`ref-map-mobile.jpg`): full screen map with dark circle pins

- [ ] Map pins should be **circular cropped** cover images (small round buttons, ~32px diameter), not square thumbnails
- [ ] Border: white 2px, subtle shadow
- [ ] Fallback for no cover image: dark circle with initial letter (current placeholder pattern, but circular)
- [ ] FloatingNav at bottom on map view
- [ ] Remove fuzzy translucent circles (not in design reference — pins alone are sufficient)

### 7. Cover images mandatory

- [ ] Add validation: publish requires a cover image (both frontend validation and ideally backend)
- [ ] Editor cover placeholder should say "Required"
- [ ] Update domain language doc: cover images are mandatory for published conversations

## Implementation Order (separate PRs)

**PR 1: FloatingNav search pill + position per page**
Small, self-contained. Fixes the nav across all pages.

**PR 2: Profile page rework**
The biggest visual gap. Action card grid, profile header, stats.

**PR 3: Map circular cover image pins**
Update MapView markers from square to circular cropped.

**PR 4: Conversation detail layout**
Full-width cover image, action bar at bottom.

**PR 5: Editor redesign**
FloatingNav editor variant, cover placeholder, publish modal. Biggest scope.

## Acceptance Criteria

- [ ] Discover mobile matches `ref-discover-mobile-with-data.png`
- [ ] Profile mobile matches `ref-profile-mobile-with-data.png`
- [ ] Map pins are circular cropped cover images
- [ ] Cover images required for publishing
- [ ] Each PR verified with agent-browser screenshots before merge

## Sources

- Design reference screenshots: `docs/design/ref-*.png`, `docs/design/ref-*.jpg`
- Design branches: `feat/v0.1-design-work`, `feat/v0.1-design-profile`
- FloatingNav source: `git show origin/feat/v0.1-design-work:src/lib/components/FloatingNav.svelte`
