---
status: complete
priority: p3
issue_id: "079"
tags: [code-review, cleanup]
dependencies: []
---

# Dead Code in MapView and Conversation Detail

## Problem Statement

PR #51 left behind dead code after removing the fuzzy circles and adding the `page` import.

## Findings

**Source:** kieran-typescript-reviewer

1. `CIRCLE_RADIUS_METERS` constant at `MapView.svelte:26` — no longer used after `L.circle()` code was removed
2. `import { page } from '$app/stores'` at `discover/+page.svelte:5` — imported but `$page` is never referenced
3. Empty `<script context="module">` block at `prompts/[id]/+page.svelte:79-81` — serves no purpose, misleading comment

## Proposed Solutions

Delete all three. ~5 lines.

## Acceptance Criteria

- [ ] No dead imports, constants, or empty script blocks in changed files

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-26 | Created from PR #51 review | Clean up dead code when removing features |
