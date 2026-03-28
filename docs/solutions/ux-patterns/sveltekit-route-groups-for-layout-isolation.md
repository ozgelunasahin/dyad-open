---
topic: Use SvelteKit route groups to isolate layout concerns
date: 2026-03-27
prs: [47, 52]
tags: [sveltekit, route-groups, layout, editor, navigation]
---

# Use SvelteKit Route Groups to Isolate Layout Concerns

## Context

The prompt editor at `/prompts/[id]/edit` initially lived inside the `(app)` route group, which wraps every authenticated page in a sidebar + main content layout. The editor needed a completely different chrome: no sidebar, no standard nav, just a full-bleed writing surface with its own FloatingNav editor variant (back button, save indicator, continue/publish dropdown).

Attempts to conditionally hide the sidebar per-page (checking `$page.url.pathname` in the layout) created coupling between the layout and its children. The layout shouldn't need to know which of its pages want a sidebar and which don't.

## What We Learned

1. **SvelteKit route groups `(groupName)` are the right tool for layout variants.** They affect only the layout hierarchy, not the URL. Moving `/prompts/[id]/edit` from `(app)` to `(editor)` gave it a bare layout with zero sidebar/nav markup, while the URL stayed the same.

2. **The `(editor)` layout needs its own auth guard.** Route groups don't inherit layouts from sibling groups. PR #47 created `(editor)/+layout.server.ts` that duplicates the auth check and username loading from `(app)/+layout.server.ts`. This is a small amount of duplication, but it's the correct trade-off: each layout group is self-contained.

3. **The editor variant of FloatingNav is a prop-based variant, not a separate component.** PR #52 added `variant='editor'` to FloatingNav with different props (`saveStatus`, `onBack`, `onSaveDraft`, `onPublish`). This kept the shared styling (pill shape, fixed positioning, backdrop blur) in one place while rendering completely different content.

4. **Full-bleed pages should never fight their parent layout.** Before the route group extraction, the editor used negative margins and `calc()` hacks to break out of the `(app)` layout's padding. After extraction, the `(editor)` layout is just `{@render children()}` -- five lines, zero constraints.

## The Fix / Pattern

When a page needs fundamentally different chrome from other pages in the same auth context:

```
src/routes/
  (app)/           ← sidebar + main content layout
    discover/
    profile/
    prompts/[id]/  ← detail page (uses sidebar)
  (editor)/        ← bare layout, just auth guard
    prompts/[id]/edit/  ← full-bleed editor
```

Each group has:
- `+layout.server.ts` -- auth guard + shared data (user, username)
- `+layout.svelte` -- the actual chrome (or lack thereof)

The URL structure is unaffected: `/prompts/[id]/edit` works the same whether it's in `(app)` or `(editor)`.

### Corollary: Don't render shared nav from the layout with child opt-out

**Confirmed during Session 3 planning (2026-03-28).** The plan initially proposed rendering FloatingNav from `(app)/+layout.svelte` with a `default` variant, and having child pages like discover "suppress" it via Svelte context to render their own variant. Architecture review rejected this:

- Same anti-pattern as conditional layout logic — the layout and children must coordinate visibility
- Two components fighting for the same viewport position (both fixed-positioned at bottom)
- Lifecycle coordination across SvelteKit navigation transitions is fragile

**Correct approach:** Each page that needs a FloatingNav renders its own variant directly. The layout stays inert. More lines of code, zero coupling. This is the same principle as route groups: children choose their chrome, not the parent.

## Why This Matters

Layout concerns bleed into every page inside a route group. Conditional layout logic (`{#if pathname.includes('edit')}`) is fragile and inverts the dependency -- the layout knows about its children instead of the children choosing their layout. Route groups make the layout decision at the filesystem level, where it's visible to anyone reading the directory structure.
