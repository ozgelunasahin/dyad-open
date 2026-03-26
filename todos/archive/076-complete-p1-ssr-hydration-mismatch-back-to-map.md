---
status: complete
priority: p1
issue_id: "076"
tags: [code-review, svelte, ssr, hydration]
dependencies: []
---

# SSR Hydration Mismatch — `typeof window` Check in Template

## Problem Statement

The "Back to map" link in `src/routes/(app)/prompts/[id]/+page.svelte:87` uses `typeof window !== 'undefined'` to conditionally render. During SSR, `window` doesn't exist so the link isn't rendered. On hydration, `window` exists so the link appears, causing a hydration mismatch.

## Findings

**Source:** kieran-typescript-reviewer, architecture-strategist

The current code:
```svelte
{#if typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'map'}
	<a href="/discover?view=map" class="back-to-map">← Back to map</a>
{/if}
```

This will either flash the link in after hydration or cause a console hydration mismatch warning.

## Proposed Solutions

### Solution A: Use `$page` store (Recommended)
Read the query param from SvelteKit's `$page` store, which is available on both server and client:
```ts
import { page } from '$app/stores';
let fromMap = $derived($page.url.searchParams.get('from') === 'map');
```
- **Pros:** SSR-correct, no hydration mismatch, idiomatic SvelteKit
- **Cons:** None
- **Effort:** Small (5 min)
- **Risk:** None

### Solution B: Pass via load function
Add `from` to the page's `load()` data.
- **Pros:** Explicit data flow
- **Cons:** Over-engineered for a single query param
- **Effort:** Small
- **Risk:** None

## Recommended Action

Solution A.

## Technical Details

- **Affected files:** `src/routes/(app)/prompts/[id]/+page.svelte`

## Acceptance Criteria

- [ ] "Back to map" link renders without hydration mismatch
- [ ] Link appears when `?from=map` is in URL
- [ ] No `typeof window` checks in Svelte templates

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-26 | Created from PR #51 review | Use `$page` store for URL params in SvelteKit |
