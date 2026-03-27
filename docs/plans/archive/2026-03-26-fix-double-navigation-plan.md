---
title: "fix: Double navigation — FloatingNav over sidebar"
type: fix
status: active
date: 2026-03-26
---

# Fix Double Navigation

The FloatingNav renders on top of the layout sidebar on all viewports. They should be mutually exclusive: sidebar on desktop (>768px), FloatingNav on mobile (<=768px).

## The Fix

1. **FloatingNav hides itself on desktop** — add `@media (min-width: 769px) { .floating-nav { display: none } }` inside the component
2. **Layout sidebar hides on mobile** — align the existing 430px breakpoint to 768px so the sidebar hides when FloatingNav appears
3. **Editor gets its own route group** — move `(app)/prompts/[id]/edit/` to `(editor)/prompts/[id]/edit/` with a bare auth-only layout (no sidebar at all)

No structural changes to the (app) layout. No new components. No per-page restructuring.

## Steps

- [ ] Add desktop media query to FloatingNav.svelte: hide above 768px
- [ ] Update (app)/+layout.svelte sidebar: hide at <=768px (currently hides at <=430px)
- [ ] Create (editor) route group with auth-only layout
- [ ] Move prompts/[id]/edit under (editor)
- [ ] Verify: desktop shows sidebar only, mobile shows FloatingNav only, editor has no sidebar
- [ ] Build passes, tests pass

## Future Work (separate PRs)

- Add FloatingNav to profile, prompt detail, etc. (incremental, per page)
- Editor redesign (FloatingNav editor variant, cover photo, publish modal)
- Profile action cards
- CSS cleanup/deduplication
