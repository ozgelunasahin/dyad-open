---
title: Back link navigation — archived reference
archived: 2026-03-29
reason: Removed in favour of FloatingNav bottom bar (always accessible, no need for contextual back links)
revisit: If FloatingNav is ever removed or if deep-linking needs explicit return paths
---

# Back Link Navigation — Archived Reference

Contextual back links at the top of detail pages. Removed because the FloatingNav at bottom provides persistent Discover + Profile navigation, making explicit back links redundant.

## Pattern

```svelte
<a href={backHref} class="back-link">{backLabel}</a>
```

## Behaviour

- Query param `?from=profile|discover` determined the back target
- Default (no param): → `/discover`
- From profile: → `/profile`
- Text changed accordingly: "← back to discover" / "← back to profile"

## Styling (from shared.css)

```css
.back-link {
    display: inline-block;
    font-size: var(--text-md);
    color: var(--text-muted);
    margin-bottom: var(--space-4);
}
.back-link:hover {
    color: var(--text-primary);
}
```

## Pages that used it

- `/conversations/[id]` — conversation detail
- `/meetings/[id]` — meeting detail
- Editor variant used FloatingNav's "← Back" button instead (different pattern)
