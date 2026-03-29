---
status: pending
priority: p2
issue_id: "100"
tags: [code-review, ux, design-principle, v0.1]
---

# Abrupt content loading — cover images cause page reflow

## Problem Statement

Cover images load after text content, causing abrupt page reflow. This happens on:
- Conversation detail page (cover image pops in after title/meta loads)
- Map view BottomSheet (text changes instantly, cover image loads later)
- Profile action cards (cover images in stacked cards)

Design principle violation: content should load together where it belongs, with subtle fade-in. Reserve space for images before they load.

## Findings

- User feedback: "instantly changing the text and then waiting for the cover image to load is strange"
- No skeleton/placeholder dimensions set for cover images
- No fade-in transition on image load
- Images use `loading="lazy"` but no aspect-ratio or min-height reservation

## Proposed Solutions

1. Add `aspect-ratio` or fixed `min-height` to image containers to reserve space
2. Add CSS `opacity: 0 → 1` transition on image `onload`
3. Add to design system docs as a loading principle

## Acceptance Criteria

- [ ] Cover images have reserved space before loading (no reflow)
- [ ] Images fade in with subtle transition (~200ms)
- [ ] Design system documents the loading pattern
