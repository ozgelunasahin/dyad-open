---
status: pending
priority: p2
issue_id: "081"
tags: [design, copy, inclusive-language]
dependencies: []
---

# RotatingHeadline Words Violate Inclusive Language Principle

## Problem Statement

The RotatingHeadline on the landing page cycles through "writers, artists, researchers, people with questions, you". The design principles explicitly say: "Avoid intellectualism signals. Language like 'independent thinkers' or 'meet through writing' creates invisible barriers."

"Writers", "artists", and "researchers" signal creative/intellectual identity. A nurse, a barista, or a retiree may not feel addressed.

## Recommended Action

Replace with more inclusive terms that emphasise curiosity and connection rather than creative identity. Examples: "neighbours, strangers, curious people, people like you, you". To be decided with product input.

## Source

- Design principles: `docs/design/design-principles.md` — "Inclusive Language" section
- Component: `src/lib/components/RotatingHeadline.svelte`
