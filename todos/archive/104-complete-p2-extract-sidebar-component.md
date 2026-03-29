---
status: pending
priority: p2
issue_id: "104"
tags: [code-review, architecture, duplication]
---

# Extract shared Sidebar.svelte — duplicated across (app) and (editor) layouts

## Problem Statement

The sidebar markup (~45 lines) and CSS (~40 lines) are byte-for-byte identical between `src/routes/(app)/+layout.svelte` and `src/routes/(editor)/+layout.svelte`. The layout server loaders are also identical. Changes to the sidebar must be made in two places — a synchronization hazard.

## Proposed Solution

1. Extract `src/lib/components/Sidebar.svelte` accepting `username`, `attentionCount`, `isAdmin`, `currentPath` props
2. Extract `src/lib/server/load-layout-data.ts` with the shared Promise.all query logic
3. Both layout files import and use these shared modules

## Acceptance Criteria

- [ ] Single Sidebar.svelte used by both layouts
- [ ] Single load-layout-data.ts called by both layout servers
- [ ] ~130 lines of duplication removed
