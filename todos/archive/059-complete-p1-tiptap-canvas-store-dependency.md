---
status: pending
priority: p1
issue_id: "059"
tags: [code-review, frontend-plan, build-blocker, phase-0]
dependencies: []
---

# TiptapEditor.svelte Has Hard Dependency on canvasStore

## Problem Statement

Phase 0 of the frontend plan deletes `src/lib/stores/canvas.svelte.ts`, but `TiptapEditor.svelte` imports it directly (`import { canvasStore } from '$lib/stores/canvas.svelte'`). This will break the build at the end of Phase 0.

The editor also registers the Wikilink extension and highlight decoration plugin, which are canvas-domain concepts with no purpose in the prompt editor.

## Findings

**Architecture review:** TiptapEditor.svelte references `canvasStore.editFocusPosition` (line 195) and `canvasStore.highlights` (line 233). These are canvas-specific features not needed for the prompt editor.

**Simplicity review:** The `$effect` blocks at lines 188-206 and 229-252 depend on canvasStore and will fail to compile after Phase 0. This is not optional — it is a build-breaking dependency.

**Learnings research:** The TipTap reactive loop prevention pattern (`docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`) documents how to safely use TipTap in Svelte 5. The prompt editor should follow this pattern with a reduced extension set (StarterKit, Link, Image only — no Wikilink).

## Proposed Solutions

### Option A: Strip canvasStore from TiptapEditor (Recommended)
Remove the `canvasStore` import and the two dependent `$effect` blocks. Remove the Wikilink extension registration. Make highlight decorations conditional (only when a `highlights` prop is provided).

- **Pros:** Minimal change, keeps one editor component
- **Cons:** May break canvas editor if ever re-enabled from main
- **Effort:** Small (30 minutes)
- **Risk:** Low — canvas is being deleted anyway

### Option B: Fork PromptEditor.svelte
Create a new `PromptEditor.svelte` with only the extensions needed for prompts (StarterKit, Link, Image). Leave TiptapEditor.svelte intact for deletion with the rest of canvas code.

- **Pros:** Clean separation, no risk of breaking anything
- **Cons:** Some duplication during Phase 0, but TiptapEditor gets deleted anyway
- **Effort:** Small-Medium (1 hour)
- **Risk:** Low

## Recommended Action

Option A — strip canvasStore dependency. Add this as a **prerequisite task** at the start of Phase 0, before any deletion begins. Verify build passes after the refactor.

## Technical Details

- **Affected files:** `src/lib/components/TiptapEditor.svelte` (lines 11, 188-206, 226-252)
- **Deleted dependency:** `src/lib/stores/canvas.svelte.ts`
- **Extensions to remove:** Wikilink, highlight decoration plugin

## Acceptance Criteria

- [ ] TiptapEditor.svelte compiles without canvasStore import
- [ ] Wikilink extension removed from prompt editor context
- [ ] Build passes after canvas store deletion
- [ ] TipTap editor still works for basic text editing (StarterKit + Link + Image)

## Resources

- Plan: `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` Phase 0, line 61
- TipTap pattern: `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`
- Existing editor: `src/lib/components/TiptapEditor.svelte`
