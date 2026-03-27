---
status: pending
priority: p2
issue_id: "070"
tags: [code-review, frontend-plan, performance, phase-2]
dependencies: ["059"]
---

# Lazy-Load TipTap Editor on Editor Routes Only

## Problem Statement

TipTap + ProseMirror produce 150-250KB of gzipped JavaScript. This bundle is only needed on two routes (`/prompts/new` and `/prompts/[id]/edit`), but if the editor component is imported at the top level, SvelteKit may include it in shared chunks affecting all pages.

## Findings

**Performance review:** The existing `TiptapEditor.svelte` uses static imports for `@tiptap/core`, `@tiptap/starter-kit`, and several extensions. All non-editor pages (landing, discover, profile, feedback, meeting detail) should not pay this bundle cost.

## Proposed Solutions

### Dynamic import with Svelte's component lazy loading
Wrap the editor in a dynamic import boundary in the editor pages:

```svelte
{#await import('$lib/components/PromptEditor.svelte') then { default: PromptEditor }}
    <PromptEditor {content} onUpdate={handleUpdate} />
{/await}
```

Or use `onMount` with a dynamic import and render only after the editor loads.

- **Effort:** Small (30 minutes)
- **Risk:** Low — standard code-splitting pattern

## Acceptance Criteria

- [ ] TipTap bundle not included in non-editor page chunks
- [ ] Editor loads without flicker on editor pages
- [ ] Loading state shown while editor chunk loads

## Resources

- Existing editor: `src/lib/components/TiptapEditor.svelte`
- SvelteKit code splitting docs
