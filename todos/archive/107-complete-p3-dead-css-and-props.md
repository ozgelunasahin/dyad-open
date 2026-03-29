---
status: pending
priority: p3
issue_id: "107"
tags: [code-review, cleanup]
---

# Dead CSS classes and unused props from refactoring

## Problem Statement

- `conversations/[id]/+page.svelte`: `.invite-section` CSS class (line ~308) — never used in template
- `conversations/[id]/+page.svelte`: `.invite-message-inline` CSS (lines ~327-338) — never used, replaced by `.invite-message-textarea`
- `BottomSheet.svelte`: `area` prop declared as optional but never rendered — dead API surface

## Acceptance Criteria

- [ ] Remove `.invite-section` CSS
- [ ] Remove `.invite-message-inline` CSS
- [ ] Remove `area` prop from BottomSheet and update onSelectPin callback signature
