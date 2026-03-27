---
status: pending
priority: p3
issue_id: "094"
tags: [code-review, css, ux]
dependencies: []
---

# SlotCard border change causes 1px layout shift

## Problem Statement

Default `.slot-card` has `border: 1px solid`, selected state changes to `border-width: 2px`. This causes 1px shift on selection toggle.

## Fix Options

- Use `outline` instead of border for selected indicator
- Use 2px border with transparent color in default state
- Add negative margin to compensate
