---
status: pending
priority: p1
issue_id: "074"
tags: [playtesting, ux, map, invitations, navigation]
dependencies: []
---

# Playtesting Fixes — v0.1 Usability Issues

Collected from live playtesting on deployed dev site.

## Issues

### Navigation
- **FloatingNav from design PRs** — discover and map view need the floating pill navigation from Ozge's `feat/v0.1-design-work` branch (FloatingNav.svelte). "Start a conversation" should be a button in the nav, not inline.

### Map View
- **Center on user location** on mobile (if location shared)
- **Hide zoom +/- controls** — pinch to zoom is sufficient on mobile
- **Full screen map** — should fill the entire viewport, not a 500px box
- **Pin click → open that conversation directly** — currently opens a neighbourhood list. Single pin should navigate to `/prompts/[id]`. Only show the list when multiple conversations cluster at the same pin.
- **Body text intermittently missing** when opening a prompt — may be a race condition or caching issue with `renderTiptapToHtml`

### Invitation Flow
- **Sent invitation not reflected on refresh** — after sending an invitation for a timeslot, refreshing the page lets you select the same slot again. The page should check if the user already has a pending invitation for each slot and disable/hide those.
- **No sent invitations view in profile** — users have no way to see invitations they've sent or their status (pending/accepted/declined)
- **No in-app notification for received invitations** — prompt authors have no way to know they received an invitation unless they check the prompt page. Need at minimum a badge/indicator in the nav or profile.

## Acceptance Criteria

- [ ] FloatingNav integrated on discover/map views
- [ ] Map: centers on user location, no zoom controls, full screen
- [ ] Map: single-pin click goes to prompt, cluster click shows list
- [ ] Prompt detail: body text always renders
- [ ] Sent invitations visible in profile
- [ ] Slots with existing pending invitation disabled on prompt detail
- [ ] Some form of notification for received invitations
