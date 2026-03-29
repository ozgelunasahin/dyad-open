---
title: "Centralized copy needs route metadata for non-developer editors"
problem_type: process
modules: [copy, i18n, collaboration]
severity: medium
date_discovered: 2026-03-28
status: resolved
tags: [process, copy, co-founder, collaboration]
---

# Centralized copy needs route metadata

## Problem

The initial `copy.ts` was created with organized sections (nav, conversation, profile, etc.) but no context about WHERE each string appears. A co-founder editing copy wouldn't know:
- Which page "responsePlaceholderWithSlots" appears on
- Whether changing "Accept" affects one button or five
- What route to visit to verify the change

## Solution

Added two metadata fields to each section in `copy.ts`:

```typescript
conversation: {
    _routes: ['/conversations/[id]'],
    _description: 'Viewing a conversation: body, response form, invitation flow, author edit/archive actions.',
    responsePlaceholder: 'Write a response...',
    // ...
}
```

- `_routes`: machine-readable array of route patterns — usable by test automation to verify copy on the right pages
- `_description`: human-readable context for whoever is editing

The `as const` assertion preserves literal types. The `_` prefix convention marks metadata fields that aren't rendered.

## Prevention

When creating centralized copy/i18n modules:
- Always include WHERE context alongside the strings
- Use machine-readable route arrays for test automation
- Write descriptions assuming the reader has never seen the app code
