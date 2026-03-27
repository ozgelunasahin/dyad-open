---
title: "refactor: Rename /prompts/ routes to /conversations/"
type: refactor
status: active
date: 2026-03-27
---

# Rename /prompts/ Routes to /conversations/

Route-only rename. The database, types, and services stay as `prompts` — because a prompt IS the stored entity. A "conversation" is the emergent lifecycle (prompt + responses + invitations + meeting + feedback) that doesn't need its own table or stored state. The route says `/conversations/` because that's what users see.

## Why Route-Only

We explored a full domain rename (database + types + services + routes) and rejected it after review:

1. **A conversation is not a prompt.** Renaming `prompts` table to `conversations` incorrectly equates the container with one of its parts. The prompt is the written content; the conversation is the full lifecycle.
2. **The conversation lifecycle is derived, not stored.** It's computed from the states of child entities (prompt state, response count, invitation state, meeting state, feedback state). No table needed.
3. **The Anti-Corruption Layer is clean.** Routes = user-facing vocabulary ("conversation"). Database/types/services = internal vocabulary ("prompt"). The `domain-language.md` doc bridges the gap.

(See archived plan: `docs/plans/archive/2026-03-27-refactor-full-conversation-domain-rename-plan.md` for the rejected approach.)

## Scope

### Route directories to rename

```
src/routes/(app)/prompts/      → src/routes/(app)/conversations/
src/routes/(editor)/prompts/   → src/routes/(editor)/conversations/
```

### Links to update (~20 references across ~10 files)

All `href="/prompts/"`, `goto('/prompts/')`, and `redirect(303, '/prompts/')` in:
- `src/routes/(app)/discover/+page.svelte` (4 refs)
- `src/routes/(app)/profile/+page.svelte` (5 refs)
- `src/routes/(app)/meetings/[id]/+page.svelte` (1 ref)
- `src/routes/(app)/conversations/[id]/+page.svelte` (2 refs — after rename)
- `src/routes/(editor)/conversations/[id]/edit/+page.svelte` (2 refs — after rename)
- `src/routes/(app)/conversations/new/+page.server.ts` (1 ref — after rename)
- `src/lib/components/FloatingNav.svelte` (1 ref)
- `src/lib/components/BottomSheet.svelte` (1 ref)
- `src/routes/(app)/discover/+page.svelte` SearchOverlay onSelect (1 ref)

**Exclusion:** `fetch('/api/prompts/')` calls stay unchanged — API endpoints use internal naming.

### Documentation to update

- [ ] `CLAUDE.md` — route structure table
- [ ] `docs/design/domain-language.md` — update "Conflicts to Watch" row (resolved)

### What stays unchanged

- Database tables (`prompts`, `prompt_comments`, `prompt_invitations`)
- TypeScript types (`Prompt`, `Comment`, `MeetingInvitation`)
- Service interfaces and implementations
- API endpoints (`/api/prompts/`)
- CSS class names
- Component names (`PromptEditor.svelte`)

## Implementation

One commit:
1. `mv` the two route directories
2. Find-replace `"/prompts/` → `"/conversations/` and `'/prompts/` → `'/conversations/` in all `.svelte` and `.ts` files EXCEPT under `src/routes/api/` and EXCEPT `fetch('/api/prompts/` patterns
3. Update CLAUDE.md and domain-language.md
4. Verify: `grep -r '"/prompts/' src/ --include='*.svelte' --include='*.ts' | grep -v '/api/prompts/' | grep -v fetch` returns zero results

## Acceptance Criteria

- [ ] `/conversations/[id]` renders the conversation detail page
- [ ] `/conversations/new` creates a draft and redirects to editor
- [ ] `/conversations/[id]/edit` opens the editor
- [ ] All links use `/conversations/`
- [ ] API endpoints still at `/api/prompts/`
- [ ] Build passes, tests pass
- [ ] Grep verification: no stale `/prompts/` in user-facing routes

## Sources

- Review consensus: 4 agents agree route-only rename is correct
- Design decision: conversation lifecycle is derived, not stored — no table needed
- `docs/design/domain-language.md`
- Todo #082
