---
title: "feat: Local Development Infrastructure"
type: feat
status: active
date: 2026-03-25
---

# Local Development Infrastructure

Set up local development infrastructure for testability: local database, auth, seed data, and integration test harness — structured to avoid tight coupling to Supabase.

## Overview

The current dev workflow points at the production Supabase instance. There is no local database, no seed data, no integration tests, and no way for an agent (Claude Code, Playwright) to authenticate against a known state. This plan addresses all of that while respecting the sovereignty principles in `docs/design/shared-infrastructure-opportunities.md`: every dependency should be self-hostable, and the codebase should not be tightly coupled to Supabase.

## Problem Statement

1. **No local database** — E2E tests and dev work run against production Supabase
2. **No deterministic state** — no seed data, no way to reset to a known baseline
3. **No integration tests** — the new prompt service layer (PR #30) has zero test coverage
4. **Supabase coupling** — `locals.supabase` is called directly in 27 route handlers; auth depends on Supabase GoTrue; there's no abstraction layer for the database client
5. **Agent can't authenticate** — Claude Code / Playwright can't log in without manual intervention

## Proposed Solution

Use Supabase local dev stack (`supabase start`) for now — it's already configured in `supabase/config.toml` — but structure all new code so the Supabase dependency stays behind interfaces. Specifically:

1. **Local Supabase stack** for database + auth (already configured, just needs `.env.local` and seed data)
2. **Seed SQL** with deterministic test users and application data
3. **Test helpers** that work against service interfaces, not the Supabase client directly
4. **Integration test harness** using Vitest against the local stack
5. **`.env.local.example`** for developer onboarding

The service interfaces from PR #30 (`PromptCommandService`, `PromptQueryService`, `LocationService`) are already Supabase-free — only the implementations reference the Supabase client. This pattern should extend to all new service code.

## Technical Approach

### Architecture

```
supabase/
  config.toml           — already exists, ports configured
  seed.sql              — NEW: deterministic test users + application data
  tests/
    rls_prompts.test.sql — NEW: pgTAP tests for RLS policies

tests/
  helpers/
    auth.ts             — NEW: create authenticated clients, test user management
    db.ts               — NEW: seed/reset helpers, service factory
  integration/
    prompt-lifecycle.test.ts  — NEW: create → publish → query → archive
    prompt-rls.test.ts        — NEW: RLS policy validation
    location.test.ts          — NEW: Nominatim integration (optional, rate-limited)

.env.local.example      — NEW: template with local Supabase keys
```

### Seed Data (`supabase/seed.sql`)

Two deterministic test users with fixed UUIDs for reliable FK references:

| User | UUID | Email | Password | Username | Role |
|------|------|-------|----------|----------|------|
| Primary | `11111111-1111-1111-1111-111111111111` | `digit@test.local` | `password123` | `digit` | Author, admin |
| Secondary | `22222222-2222-2222-2222-222222222222` | `other@test.local` | `password123` | `otherperson` | Regular user |

Seed data includes:
- Auth users (`auth.users` + `auth.identities` — required for login to work)
- Profiles with usernames
- A published canvas (for landing page compatibility)
- A published prompt with time slots (for testing the new domain model)
- A draft prompt (for testing state transitions)

Uses `crypt('password', gen_salt('bf'))` for password hashing (pgcrypto, loaded by default in Supabase).

### Test Helpers (`tests/helpers/`)

**`auth.ts`** — Authenticated client factory:

```typescript
// Works with any SupabaseClient — not coupled to a specific instance
export async function createAuthenticatedClient(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<SupabaseClient>

// Admin client for setup/teardown (service role key)
export function createAdminClient(
  supabaseUrl: string,
  serviceRoleKey: string
): SupabaseClient
```

**`db.ts`** — Service factory that creates service instances from a client:

```typescript
// Returns service instances — the tests interact with interfaces, not Supabase directly
export function createServices(supabase: SupabaseClient): {
  promptCommand: PromptCommandService;
  promptQuery: PromptQueryService;
}
```

This means tests are written against `PromptCommandService.create()`, not `supabase.from('prompts').insert()`. When we swap Supabase for plain Postgres later, only the factory function changes.

### Integration Tests

**Test against the service interfaces**, not the Supabase client:

```typescript
// tests/integration/prompt-lifecycle.test.ts
describe('Prompt lifecycle', () => {
  it('creates a draft, publishes with slots, queries on discover', async () => {
    const { promptCommand, promptQuery } = createServices(userClient);

    const draft = await promptCommand.create(userId, { title: 'Test' });
    expect(draft.state).toBe('draft');

    await promptCommand.publish(draft.id, userId, [slot]);

    const feed = await promptQuery.getPublishedPrompts({ region: 'berlin', userId: otherUserId });
    expect(feed.some(p => p.id === draft.id)).toBe(true);
  });
});
```

**Test isolation**: Each test suite creates its own users via the admin API with unique IDs, and cleans up in `afterAll`. No shared mutable state between suites. For CI, `supabase db reset` runs once before the entire test suite via `globalSetup`.

**pgTAP tests** for RLS policies (run with `supabase test db`):
- Author can CRUD own prompts
- Authenticated user can read published prompts but not drafts
- Author can manage own time slots
- Non-author cannot modify another's prompts

### Environment Configuration

**`.env.local.example`** (committed to git):
```bash
# Local Supabase — run `supabase start` then `supabase status` for keys
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<paste from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<paste from supabase status>
```

**`supabase/config.toml` fix**: Update `site_url` from port 3000 to 5173 (the actual SvelteKit dev port).

**Package scripts**:
```json
{
  "setup": "supabase start && supabase db reset",
  "reset": "supabase db reset",
  "test:integration": "vitest run --config vitest.config.integration.ts",
  "test:db": "supabase test db"
}
```

### Decoupling Considerations

Per `docs/design/shared-infrastructure-opportunities.md`, every dependency should be self-hostable. The current Supabase coupling points are:

| Coupling Point | Current State | Mitigation |
|----------------|--------------|------------|
| `locals.supabase.from()` in 27 routes | Direct Supabase client calls | New routes use service interfaces; existing routes unchanged for now |
| `@supabase/ssr` in `hooks.server.ts` | Auth tied to Supabase GoTrue | Single file to swap; OIDC migration on roadmap |
| RLS policies | Supabase-specific (but standard Postgres) | Standard Postgres RLS — works with any Postgres host |
| `supabase start` for local dev | Docker-based local stack | Could be replaced with plain `docker-compose` Postgres + GoTrue |
| Seed SQL references `auth.users` | Supabase auth schema | Would need adapting for non-Supabase auth |

**What we do now**: Use Supabase local stack, but write all new code against service interfaces. Tests interact with interfaces, not the Supabase client.

**What we defer**: Abstracting the 27 existing route handlers. Replacing Supabase Auth with OIDC. Running against plain Postgres without GoTrue.

## Implementation Phases

### Phase 1: Local Stack + Seed Data

- [ ] Fix `supabase/config.toml` — update `site_url` to port 5173
- [ ] Create `supabase/seed.sql` — two test users (auth.users + auth.identities + profiles), one published prompt with slots, one draft prompt, one published canvas for landing page
- [ ] Create `.env.local.example` with instructions
- [ ] Add `setup` and `reset` scripts to `package.json`
- [ ] Verify `supabase start && supabase db reset` produces a working local instance
- [ ] Verify SvelteKit dev server works against local Supabase (login, discover page)

### Phase 2: Test Helpers + Integration Tests

- [ ] Create `tests/helpers/auth.ts` — authenticated client factory, admin client
- [ ] Create `tests/helpers/db.ts` — service factory
- [ ] Create `vitest.config.integration.ts` — separate config for integration tests
- [ ] Create `tests/integration/prompt-lifecycle.test.ts` — full create → publish → query → archive cycle
- [ ] Create `tests/integration/prompt-rls.test.ts` — RLS policy validation via service layer
- [ ] Add `test:integration` script to `package.json`
- [ ] Verify tests pass against local Supabase

### Phase 3: pgTAP + Playwright Update

- [ ] Create `supabase/tests/rls_prompts.test.sql` — pgTAP tests for prompt and time_slot RLS
- [ ] Add `test:db` script to `package.json`
- [ ] Update `tests/auth.setup.ts` to authenticate against local Supabase (not production)
- [ ] Update `playwright.config.ts` to use local Supabase URL

## Acceptance Criteria

### Functional Requirements

- [ ] `npm run setup` starts local Supabase and seeds the database with test users and application data
- [ ] `npm run reset` resets the database to the seeded state
- [ ] Developer can log in to the local app with `digit@test.local` / `password123`
- [ ] `npm run test:integration` runs prompt lifecycle tests against local Supabase
- [ ] `npm run test:db` runs pgTAP tests for RLS policies
- [ ] Playwright tests authenticate against local Supabase, not production

### Non-Functional Requirements

- [ ] All new test code interacts with service interfaces, not the Supabase client directly
- [ ] No production credentials in any committed file
- [ ] `supabase start` + `supabase db reset` completes in under 60 seconds
- [ ] Tests are isolated — each suite creates/cleans its own data

### Quality Gates

- [ ] Integration tests cover the full prompt lifecycle (create, update, publish, query, unpublish, republish, delete)
- [ ] RLS tests verify author-only writes and published-only reads
- [ ] `.env.local.example` contains clear setup instructions

## Dependencies & Risks

- **Docker required** — `supabase start` needs Docker. Documented in `.env.local.example`.
- **Port conflicts** — local Supabase uses ports 54321-54327. May conflict with other services.
- **Seed SQL fragility** — `auth.users` schema is Supabase-internal and may change between versions. Mitigated by pinning Supabase CLI version.
- **Nominatim rate limits** — location service integration tests hit the public API (1 req/sec). May be flaky in CI. Consider mocking or skipping in CI.

## Sources & References

### Design Documents

- `docs/design/shared-infrastructure-opportunities.md` — EU sovereignty requirements, self-hostable infrastructure mandate
- `docs/design/design-principles.md` — quality requirements (feedback gate, state machines)
- `docs/plans/2026-03-24-feat-domain-driven-design-plan.md` — service layer architecture, bounded contexts
- `docs/plans/2026-03-24-feat-prompt-schema-crud-discover-plan.md` — prompt schema, API endpoints being tested

### External References

- [Supabase Local Development](https://supabase.com/docs/guides/local-development/overview)
- [Supabase Seeding](https://supabase.com/docs/guides/local-development/seeding-your-database)
- [Supabase pgTAP Testing](https://supabase.com/docs/guides/database/extensions/pgtap)
- [Seeding auth.users pattern](https://gist.github.com/khattaksd/4e8f4c89f4e928a2ecaad56d4a17ecd1)
- [SvelteKit Testing](https://svelte.dev/docs/svelte/testing)

### Internal References

- `supabase/config.toml` — existing local config (ports, auth, seed)
- `src/hooks.server.ts` — single Supabase client creation point
- `src/lib/services/prompt-command.ts` — service interface pattern to follow
- `tests/auth.setup.ts` — existing Playwright auth (currently points at production)
