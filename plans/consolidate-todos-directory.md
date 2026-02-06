# Plan: Consolidate Todos Directory

## Overview

The `todos/` directory has 66 files — 32 completed, 34 pending. It suffers from duplicate IDs, inconsistent naming, and completed items cluttering active work. Clean it up: archive completed items, deduplicate IDs, normalize naming, and triage stale pending items.

## Problem Statement

1. **Duplicate IDs**: IDs 001–015 each have 2–3 files sharing the same prefix (e.g., three `010-*` files)
2. **Inconsistent status keywords**: filenames use both `complete` and `completed`; frontmatter uses `complete` (21) and `completed` (12)
3. **Completed items clutter**: 32 completed files mixed with 34 pending — hard to see what's actionable
4. **Stale pending items**: Some reference code/architecture that has changed (e.g., vault sync references `static/vault/` patterns that may be superseded by Supabase migration)
5. **Inconsistent frontmatter**: Some use `issue_id`, others `id`; some have `title`/`created`, others don't

## Step 1: Archive Completed Todos

Move all 32 completed files to `todos/archive/`. They have historical value but shouldn't clutter the active list.

**Files to move** (32):
```
001-complete-p1-unauthenticated-notes-api.md
001-complete-p1-xss-markdown-rendering.md
002-complete-p1-canvas-delete-authorization.md
002-complete-p1-double-save-race-condition.md
003-complete-p1-save-snapshot-divergence.md
003-complete-p1-xss-markdown-rendering.md
004-complete-p1-edit-mode-race-on-enter.md
004-complete-p1-non-atomic-position-save.md
005-complete-p1-api-request-body-validation.md
010-completed-p1-fixed-card-width.md
010-complete-p2-duplicate-markdown-loading.md
011-completed-p1-consistent-link-pan-behavior.md
012-completed-p2-remove-landing-page.md
012-complete-p2-api-response-types.md
013-completed-p2-remove-debug-and-arrow-buttons.md
014-completed-p2-help-keyboard-shortcuts.md
014-complete-p2-saved-status-timer-leak.md
015-completed-p1-reset-password.md
015-complete-p3-content-size-limit.md
019-completed-p1-plan-phase3-yagni.md
020-completed-p1-plan-coordinate-confusion.md
021-complete-p1-plan-activechain-duplicates.md
022-completed-p2-plan-linkside-in-canvas.md
023-completed-p2-plan-phase4-premature.md
024-completed-p2-plan-linkside-type.md
025-completed-p2-plan-scoring-constants.md
033-complete-p1-dead-tree-layout-code.md
034-complete-p1-string-key-matching-bug.md
035-complete-p2-navigation-race-conditions.md
036-complete-p2-restore-chain-not-atomic.md
037-complete-p2-regenerate-paths-on2-complexity.md
039-complete-p2-duplicate-geometry-functions.md
```

## Step 2: Renumber Pending Todos

After archiving, renumber the 34 pending files with sequential IDs (001–034) to eliminate duplicates. Drop the status keyword from filenames since all remaining files are pending.

**New naming convention**: `{NNN}-{priority}-{description}.md`

| Old filename | New filename |
|---|---|
| `005-pending-p2-missing-database-indexes.md` | `001-p2-missing-database-indexes.md` |
| `006-pending-p2-missing-rate-limiting.md` | `002-p2-missing-rate-limiting.md` |
| `006-pending-p2-no-authentication-api.md` | `003-p2-no-authentication-api.md` |
| `007-pending-p2-memory-leak-animation-frames.md` | `004-p2-memory-leak-animation-frames.md` |
| `007-pending-p2-missing-security-headers.md` | `005-p2-missing-security-headers.md` |
| `008-pending-p2-canvas-page-duplication.md` | `006-p2-canvas-page-duplication.md` |
| `008-pending-p2-dom-traversal-performance.md` | `007-p2-dom-traversal-performance.md` |
| `009-pending-p2-resize-observer-throttling.md` | `008-p2-resize-observer-throttling.md` |
| `009-pending-p2-vault-sync-issue.md` | `009-p2-vault-sync-issue.md` |
| `010-pending-p2-unsafe-json-parse.md` | `010-p2-unsafe-json-parse.md` |
| `011-pending-p2-api-consistency.md` | `011-p2-api-consistency.md` |
| `011-pending-p2-resize-observer-gc-pressure.md` | `012-p2-resize-observer-gc-pressure.md` |
| `012-pending-p2-agent-native-apis.md` | `013-p2-agent-native-apis.md` |
| `013-pending-p2-custom-event-type-safety.md` | `014-p2-custom-event-type-safety.md` |
| `013-pending-p3-remove-debug-system.md` | `015-p3-remove-debug-system.md` |
| `014-pending-p3-remove-localstorage-persistence.md` | `016-p3-remove-localstorage-persistence.md` |
| `015-pending-p3-slug-generation-duplication.md` | `017-p3-slug-generation-duplication.md` |
| `016-pending-p2-styling-garamond.md` | `018-p2-styling-garamond.md` |
| `016-pending-p3-console-log-removal.md` | `019-p3-console-log-removal.md` |
| `017-pending-p3-logout-csrf.md` | `020-p3-logout-csrf.md` |
| `017-pending-p3-security-headers.md` | `021-p3-security-headers.md` |
| `018-pending-p3-localstorage-validation.md` | `022-p3-localstorage-validation.md` |
| `026-pending-p2-plan-savedcardstate-cleanup.md` | `023-p2-plan-savedcardstate-cleanup.md` |
| `027-pending-p2-regenerate-paths-performance.md` | `024-p2-regenerate-paths-performance.md` |
| `028-pending-p2-remove-dead-pathfinding-code.md` | `025-p2-remove-dead-pathfinding-code.md` |
| `029-pending-p2-layout-scoring-performance.md` | `026-p2-layout-scoring-performance.md` |
| `030-pending-p3-cleanup-unused-debug-types.md` | `027-p3-cleanup-unused-debug-types.md` |
| `031-pending-p2-type-safety-assertions.md` | `028-p2-type-safety-assertions.md` |
| `032-pending-p3-dry-violations-canvas.md` | `029-p3-dry-violations-canvas.md` |
| `038-pending-p2-edit-save-navigation-race.md` | `030-p2-edit-save-navigation-race.md` |
| `040-pending-p2-map-mutation-utilities.md` | `031-p2-map-mutation-utilities.md` |
| `041-pending-p3-magic-number-link-position.md` | `032-p3-magic-number-link-position.md` |
| `042-pending-p3-unused-existingpaths-parameter.md` | `033-p3-unused-existingpaths-parameter.md` |
| `043-pending-p3-unused-linkside-parameter.md` | `034-p3-unused-linkside-parameter.md` |

## Step 3: Normalize Frontmatter

Update each pending file's frontmatter to use consistent keys:

```yaml
---
id: "NNN"          # matches filename prefix (was issue_id in some)
status: pending    # all pending files
priority: p2       # keep existing
tags: [...]        # keep existing
---
```

- Rename `issue_id` → `id`
- Remove `dependencies: []` (unused noise)
- Keep `tags`, `title`, `created` if present

## Step 4: Verify — No Files Left Behind

After all moves and renames:
- `todos/` should contain exactly 34 pending files (001–034)
- `todos/archive/` should contain exactly 32 completed files
- No duplicate IDs in `todos/`
- All frontmatter `id` fields match filename prefixes

## Result

**Before**: 66 files, duplicate IDs, mixed statuses, no organization
**After**: 34 active pending files + 32 archived completed files, clean sequential IDs, consistent naming

### Priority summary of pending items
- **p2** (22 items): Database indexes, rate limiting, auth, memory leaks, security headers, performance, race conditions, type safety
- **p3** (12 items): Debug cleanup, console logs, CSRF, DRY violations, unused parameters
