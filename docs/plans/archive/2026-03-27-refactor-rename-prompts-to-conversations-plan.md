---
title: "refactor: Rename /prompts/ routes to /conversations/"
type: refactor
status: active
date: 2026-03-27
---

# Rename /prompts/ Routes to /conversations/

The user-facing URL is `/prompts/[id]` but the domain language says "conversation". Rename all user-facing routes. API endpoints stay as `/api/prompts/` (internal naming).

## Scope

### Route directories to rename

```
src/routes/(app)/prompts/          → src/routes/(app)/conversations/
src/routes/(app)/prompts/[id]/     → src/routes/(app)/conversations/[id]/
src/routes/(app)/prompts/new/      → src/routes/(app)/conversations/new/
src/routes/(editor)/prompts/       → src/routes/(editor)/conversations/
src/routes/(editor)/prompts/[id]/  → src/routes/(editor)/conversations/[id]/
```

### Links to update (15 references across 8 files)

| File | Count | Type |
|------|-------|------|
| `src/routes/(app)/discover/+page.svelte` | 1 | `href="/prompts/{prompt.id}"` |
| `src/routes/(app)/profile/+page.svelte` | 5 | `href="/prompts/{...}"` links |
| `src/routes/(app)/meetings/[id]/+page.svelte` | 1 | conversation card link |
| `src/routes/(app)/prompts/[id]/+page.svelte` | 2 | `goto` after accept |
| `src/lib/components/FloatingNav.svelte` | 1 | `href="/prompts/new"` |
| `src/lib/components/BottomSheet.svelte` | 1 | `href="/prompts/{prompt.id}"` |
| `src/routes/(app)/prompts/new/+page.server.ts` | 1 | redirect to `/prompts/[id]/edit` |
| `src/routes/(editor)/prompts/[id]/edit/+page.svelte` | 1 | goto after publish |

### What stays unchanged

- `src/routes/api/prompts/` — API endpoints use internal naming
- `prompts` database table — internal data model
- `Prompt`, `PromptSummary`, `PromptDetail` types — internal types
- Service methods: `getMyPrompts`, `getPublishedPrompts`, etc.
- `docs/design/domain-language.md` — already documents this mapping

## Implementation

One commit, mechanical find-and-replace:

1. `mv src/routes/(app)/prompts src/routes/(app)/conversations`
2. `mv src/routes/(editor)/prompts src/routes/(editor)/conversations`
3. Find-replace `"/prompts/` → `"/conversations/` in all `.svelte` and `.ts` files (excluding `src/routes/api/`)
4. Find-replace `'/prompts/` → `'/conversations/` (single quotes)
5. Update redirect in new page server: `/prompts/[id]/edit` → `/conversations/[id]/edit`
6. Update CLAUDE.md route structure table

## What NOT to do

- Don't rename API endpoints (`/api/prompts/` stays)
- Don't rename the database table
- Don't rename TypeScript types or service methods
- Don't add redirects from old URLs (no users have bookmarked `/prompts/` yet — v0.1 with 2 test users)

## Acceptance Criteria

- [ ] `/conversations/[id]` renders the conversation detail page
- [ ] `/conversations/new` creates a draft and redirects to editor
- [ ] `/conversations/[id]/edit` opens the editor
- [ ] All links throughout the app use `/conversations/`
- [ ] API endpoints still work at `/api/prompts/`
- [ ] Build passes, tests pass
- [ ] No references to `/prompts/` remain in user-facing routes or links (grep verify)

## Sources

- Todo #082
- `docs/design/domain-language.md` — internal "prompt" → user-facing "conversation"
