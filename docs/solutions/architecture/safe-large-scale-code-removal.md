---
topic: Safely removing ~28k lines of legacy code
date: 2026-03-27
prs: [38, 32]
tags: [refactoring, code-removal, migration, risk-management]
---

# Safe Large-Scale Code Removal

## Context

PR #38 removed ~28,600 lines of canvas-era code: 81 files including routes, components, stores, API endpoints, and utilities. This was the largest single PR in the project. The canvas system was being replaced by a prompt-based domain model (built in PRs #32-36). The removal had to happen without breaking the surviving prompt-domain code.

## What We Learned

### 1. Extract shared utilities before deleting their only consumer

Several utilities were used by both the canvas code (being deleted) and the prompt code (surviving). The most critical was `validateJSONContent` -- used by both the old notes API and the new prompt validation. PR #38 extracted it to a shared location (`src/lib/server/validate-tiptap-content.ts`) before deleting the notes API that originally housed it.

If you delete the file first and extract later, you lose the implementation. This sounds obvious, but under the pressure of a large deletion PR, it's easy to miss that a file has dual consumers.

The same applied to `tiptap-html.ts` (server-side TipTap rendering) and `json-content.ts` (JSON-to-plaintext for body snippets). Both survived because they were already in shared locations, but their survival needed to be verified before the deletion.

### 2. The discover page was the hardest file, not the deletions

The discover page (`+page.server.ts` and `+page.svelte`) wasn't deleted -- it was rewritten. PR #32 rewired it from canvas queries to prompt-service queries, and PR #38 stripped out remaining canvas-era UI code (MapView integration, inline comment/invite flows, legacy feedback loading). Rewriting a surviving file that depends on both old and new code is harder than deleting a file outright, because you must understand what stays and what goes.

### 3. Copy-on-write reactivity survived the migration

The Svelte 5 runes pattern of creating new `Set()` instances on every mutation (required for reactivity) appeared in both the canvas code and the prompt code. The discover page's filter state (`selectedDates`, `selectedAreas`) uses the same copy-on-write pattern:

```typescript
function toggleDate(date: string) {
  const next = new Set(selectedDates);
  if (next.has(date)) next.delete(date);
  else next.add(date);
  selectedDates = next; // assignment triggers reactivity
}
```

This pattern was preserved during the rewrite because it's a Svelte 5 fundamental, not canvas-specific. A developer unfamiliar with runes might try to mutate in-place and wonder why the UI doesn't update.

### 4. Verify zero stale imports after deletion

After removing 81 files, the build must pass with zero unresolved imports. The PR summary notes "zero stale imports to deleted files" -- this was verified by running the full build and `svelte-check`. This is the one validation step that cannot be skipped: a single stale import to a deleted module breaks the entire app at build time.

### 5. Deletion PRs are deceptively complex to review

A PR that adds 1,800 lines and removes 28,600 lines looks simple: "just deletions." But the reviewer must verify:
- No shared utility was accidentally deleted
- Surviving files don't reference deleted files
- No database migration depends on deleted code
- Seed data still works without deleted tables' seed data
- Test helpers don't reference deleted services

The deletion count makes the diff look large but most of it is "confirm this is safe to remove." The real review effort is in the 1,800 surviving/modified lines.

## The Fix / Pattern

When planning a large code removal:

1. **Inventory shared code first.** Search for imports from the to-be-deleted files. Any import from a surviving file means the imported utility must be preserved (extracted or moved).
2. **Extract before deleting.** Move shared utilities to stable locations in a preparatory commit. Don't combine extraction with deletion in the same commit.
3. **Build after each batch of deletions.** Don't delete everything at once and hope it compiles. Delete routes, build. Delete components, build. Delete stores, build.
4. **Remove dependencies from package.json.** PR #37 removed `resend`; PR #38 removed `d3-zoom` and `d3-selection`. Stale dependencies in `package.json` aren't harmful but signal unfinished cleanup.
5. **Run the full test suite.** Unit tests and integration tests together. If integration tests reference deleted seed data or services, they'll fail.
6. **Document what survives.** The PR description should list what was NOT deleted and why. This is more valuable than listing what was deleted.

## Why This Matters

Large-scale code removal happens at every major product pivot. The canvas-to-prompt migration was the first, but won't be the last (the CLAUDE.md notes a potential auth migration and canvas extraction). A developer doing the next large removal should follow the same extract-then-delete pattern and resist the urge to do it all in one pass.
