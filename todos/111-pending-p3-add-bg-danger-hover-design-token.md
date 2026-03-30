---
id: 111
status: pending
priority: p3
title: Add --bg-danger-hover design token
tags: [code-review, design-system]
---

# Add --bg-danger-hover design token

The `.dropdown-item--danger:hover` in FloatingNav uses a hardcoded `rgba(220, 38, 38, 0.06)`. Add a `--bg-danger-hover` token to `src/app.css` and reference it.

## Files

- `src/app.css` — add token
- `src/lib/components/FloatingNav.svelte` — use token
