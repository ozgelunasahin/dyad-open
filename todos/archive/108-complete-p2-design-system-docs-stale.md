---
status: pending
priority: p2
issue_id: "108"
tags: [code-review, docs]
---

# Design system docs out of date with current code

## Problem Statement

`docs/design/design-system.md` has several statements that no longer match the code:

- **Lines 97-98**: "No sidebar" for editor layout — editor now has a full sidebar
- **Lines 147-154**: BottomSheet described with "Fixed backdrop with semi-transparent black" and "Close button top-right" — both removed
- **Line 154**: "Desktop: centered modal" for BottomSheet — now always bottom-anchored

## Acceptance Criteria

- [ ] Editor layout section updated (sidebar present on desktop)
- [ ] BottomSheet section updated (no backdrop, no close button, dismissed via map click)
- [ ] Desktop BottomSheet positioning documented
