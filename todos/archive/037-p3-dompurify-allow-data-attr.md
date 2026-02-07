---
status: pending
priority: p3
id: "037"
tags: [code-review, security]
---

# ALLOW_DATA_ATTR: true Is Broader Than Needed

## Problem Statement

`src/lib/utils/tiptap-html.ts` line 103 sets `ALLOW_DATA_ATTR: true` in DOMPurify config, which allows all `data-*` attributes through. Only `data-target` is needed for wikilinks, and it's already in the explicit `ALLOWED_ATTR` list.

## Proposed Solution

Remove `ALLOW_DATA_ATTR: true` from PURIFY_CONFIG. The `data-target` attribute is already permitted via `ALLOWED_ATTR`.

**Effort:** Small (5 min)
**Risk:** Very low — test that wikilink rendering still works

## Acceptance Criteria

- [ ] `ALLOW_DATA_ATTR: true` removed
- [ ] Wikilinks still render correctly in site previews

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-06 | Created from hand-off review | |
