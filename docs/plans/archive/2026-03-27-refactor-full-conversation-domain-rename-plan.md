---
title: "refactor: Full conversation domain rename — DB, types, services, routes"
type: refactor
status: active
date: 2026-03-27
---

# Full Conversation Domain Rename

Rename "prompt" to "conversation" at every layer: database tables, TypeScript types, service interfaces, API endpoints, and routes. Now, while we have zero user data and can reset the database freely.

## Why Now

- Zero user data — `supabase db reset` is free
- No external API consumers
- No bookmarks to preserve
- 2 test users on local dev only
- The cost of doing this later (with real data) is 10x higher and requires phased migrations with compatibility views

## What Gets Renamed

### Database (migration)

| Current | New |
|---------|-----|
| `prompts` table | `conversations` |
| `prompt_comments` table | `conversation_responses` |
| `prompt_invitations` table | `conversation_invitations` |
| `prompt_id` column (on time_slots, conversation_responses, conversation_invitations, meetings) | `conversation_id` |
| `comment_id` column (on conversation_invitations) | `response_id` |

The migration must also:
- [ ] Recreate 7 RLS policies that subquery `FROM prompts` (they don't auto-update)
- [ ] Recreate 5 SECURITY DEFINER functions (body text doesn't auto-update)
- [ ] Rename 3 RLS policies on the conversations table for clarity
- [ ] Reissue column-level grants on `time_slots` (they reference columns by name)
- [ ] Rename constraints: `uq_one_comment_per_user_per_prompt` → `uq_one_response_per_user_per_conversation`
- [ ] Rename indexes: `idx_prompts_author`, `idx_prompts_discover`, etc.
- [ ] Update the `time_slots_public` view if it references renamed columns
- [ ] Run `NOTIFY pgrst, 'reload schema'` at the end
- [ ] Entire migration in one `BEGIN`/`COMMIT` transaction

### TypeScript Types (`src/lib/domain/types.ts`)

| Current | New |
|---------|-----|
| `PromptState` | `ConversationState` |
| `Prompt` | `Conversation` |
| `PromptSummary` | `ConversationSummary` |
| `PromptDetail` | `ConversationDetail` |
| `Comment` | `Response` |
| `MeetingInvitation` | `ConversationInvitation` |
| Fields: `prompt_id` | `conversation_id` |
| Fields: `comment_id` | `response_id` |

### Service Interfaces + Implementations (`src/lib/services/`)

| Current | New |
|---------|-----|
| `prompt-command.ts` | `conversation-command.ts` |
| `prompt-query.ts` | `conversation-query.ts` |
| `comment.ts` | `response.ts` |
| `invitation.ts` | `conversation-invitation.ts` |
| `PromptCommandService` | `ConversationCommandService` |
| `PromptQueryService` | `ConversationQueryService` |
| `SupabasePromptCommandService` | `SupabaseConversationCommandService` |
| `SupabasePromptQueryService` | `SupabaseConversationQueryService` |
| `CommentService` | `ResponseService` |
| `SupabaseCommentService` | `SupabaseResponseService` |
| `InvitationService` | `ConversationInvitationService` |
| `SupabaseInvitationService` | `SupabaseConversationInvitationService` |
| All `.from('prompts')` → `.from('conversations')` |
| All `.from('prompt_comments')` → `.from('conversation_responses')` |
| All `.from('prompt_invitations')` → `.from('conversation_invitations')` |
| All `.eq('prompt_id', ...)` → `.eq('conversation_id', ...)` |
| All `.eq('comment_id', ...)` → `.eq('response_id', ...)` |

### API Routes (`src/routes/api/`)

| Current | New |
|---------|-----|
| `src/routes/api/prompts/` | `src/routes/api/conversations/` |
| `src/routes/api/prompts/[id]/comments/` | `src/routes/api/conversations/[id]/responses/` |
| `src/routes/api/prompts/[id]/invitations/` | `src/routes/api/conversations/[id]/invitations/` |
| `src/routes/api/prompts/[id]/publish/` | `src/routes/api/conversations/[id]/publish/` |
| `src/routes/api/prompts/[id]/unpublish/` | `src/routes/api/conversations/[id]/unpublish/` |
| `src/routes/api/prompts/[id]/republish/` | `src/routes/api/conversations/[id]/republish/` |
| `src/routes/api/prompts/[id]/slots/` | `src/routes/api/conversations/[id]/slots/` |
| `src/routes/api/invitations/` | stays (invitations are accessed by their own ID) |

### Page Routes

| Current | New |
|---------|-----|
| `src/routes/(app)/prompts/` | `src/routes/(app)/conversations/` |
| `src/routes/(editor)/prompts/` | `src/routes/(editor)/conversations/` |
| All `href="/prompts/"` links | `href="/conversations/"` |
| All `goto('/prompts/')` calls | `goto('/conversations/')` |
| All `fetch('/api/prompts/')` calls | `fetch('/api/conversations/')` |

### Page Servers + Components

All `.svelte` and `.ts` files that import services or reference types:
- [ ] Update imports: `from '$lib/services/prompt-command.js'` → `from '$lib/services/conversation-command.js'`
- [ ] Update type imports: `import type { Prompt }` → `import type { Conversation }`
- [ ] Update variable names where they appear in templates: `data.prompt` → `data.conversation`, `data.prompts` → `data.conversations`
- [ ] Update `prompt.title`, `prompt.cover_image_url` etc. in template expressions

### Test Files (`tests/`)

- [ ] Update `tests/helpers/db.ts` — service factory creates new service names
- [ ] Update `tests/helpers/auth.ts` — `SEED_PROMPTS` → `SEED_CONVERSATIONS`
- [ ] Update all 6 integration test files — type references, service calls, table references
- [ ] Update `supabase/seed.sql` — table names in INSERT statements

### Documentation

- [ ] `CLAUDE.md` — route structure, service layer, key files, database section
- [ ] `docs/design/domain-language.md` — remove "Conflicts to Watch" row, update mapping table
- [ ] `docs/design/design-system.md` — any route references
- [ ] Active plans — update file references in `docs/plans/`
- [ ] Archived plans — leave as-is (historical)

## Implementation Order

**Step 1: Database migration**
Write and test the migration locally. `supabase db reset` to verify. This is the riskiest step — get it right first.

**Step 2: Service layer rename**
Rename files, interfaces, implementations. Mechanical find-replace. Run unit tests.

**Step 3: API route rename**
Rename directories. Update all `fetch()` calls. Run integration tests.

**Step 4: Page route rename**
Rename directories. Update all links and goto calls.

**Step 5: Type rename**
Rename types in `types.ts`. Update all imports and template references. This touches the most files.

**Step 6: Test + seed update**
Update test helpers, integration tests, seed script.

**Step 7: Documentation update**
CLAUDE.md, domain-language.md, design-system.md, active plans.

**Step 8: Verify**
- `supabase db reset` — migrations apply cleanly
- `npm test` — 74 unit tests pass
- `npm run test:integration` — integration tests pass (if running)
- `npm run build` — build succeeds
- Playwright MCP — smoke test the app
- `grep -r 'prompt' src/ --include='*.ts' --include='*.svelte' | grep -v node_modules | grep -v '.svelte-kit'` — verify no stale references remain (some will be in variable names within page servers that interface with the DB — these should all say `conversation` now)

## What Does NOT Change

- `meetings` table — already uses correct name
- `feedback_forms` table — already uses correct name
- `time_slots` table — already uses correct name (column `prompt_id` → `conversation_id` does change)
- `MeetingService`, `FeedbackService`, `GateService` — already correct
- `Meeting`, `TimeSlot`, `FeedbackForm` types — already correct (fields with `prompt_id` → `conversation_id` do change)

## Acceptance Criteria

- [ ] `supabase db reset` applies all migrations without error
- [ ] No table, column, or function references `prompts` or `prompt_comments` or `prompt_invitations`
- [ ] All RLS policies work (test by querying as different users)
- [ ] All SECURITY DEFINER functions work (test accept_invitation, archive_stale)
- [ ] TypeScript types use `Conversation*` names
- [ ] Services use `Conversation*` names
- [ ] API endpoints at `/api/conversations/`
- [ ] Page routes at `/conversations/`
- [ ] All 74 unit tests pass
- [ ] Integration tests pass
- [ ] Build passes
- [ ] App works end-to-end (Playwright smoke test)
- [ ] `domain-language.md` updated — no more conflicts

## Sources

- Data integrity review: phased migration approach, RLS/function breakage risks
- Architecture review: Anti-Corruption Layer analysis, domain boundary assessment
- Simplicity review: blast radius analysis (45+ files for full rename)
- Todo #082
- `docs/design/domain-language.md`
