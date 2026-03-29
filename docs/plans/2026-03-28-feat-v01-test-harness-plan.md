---
title: "feat: v0.1 Test Harness — E2E coverage + CI/CD"
type: feat
status: completed
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
deepened: 2026-03-28
reviewed: 2026-03-29
---

# v0.1 Test Harness

Test coverage for the critical path + CI/CD pipeline. Scoped to alpha with a cost-to-change lens: don't over-invest in infrastructure that will be reworked for v0.2 (1000 users).

## Review Findings (2026-03-29)

Re-reviewed against dev branch after Sessions 3b (PR #66) and 4a (PR #68) merged.

Reviewed by: architecture-strategist, security-sentinel, code-simplicity-reviewer.

**Changes from 2026-03-28 review:**

1. **SEED_USERS/SEED_PROMPTS are deeply stale.** `digit`/`other` must become `lisa`/`marco` to match current seed.sql. `SEED_PROMPTS.other` → `SEED_PROMPTS.marco`. Added as explicit sub-item of Item 2.
2. **Email domain change must be atomic.** seed.sql + TEST_USERS + auth.setup.ts + core-flow.test.ts all in one commit. Noted in Item 2.
3. **Item 1 expanded** to cover ALL 4 integration test files with missing cleanup (not just feedback + meeting).
4. **Multi-viewport simplified.** Single desktop project + inline mobile context in smoke test. No file naming convention. No 3-project config.
5. **`SupabaseClient<Database>` dropped.** Premature — fails loudly anyway, requires maintaining generated types.
6. **Item 4 (admin E2E) removed** — low value for <10 testers.
7. **Item 6 (placeholder tests) removed** — YAGNI. Write tests when needed, not as placeholders.
8. **Localhost guard simplified** — plain `if/throw`, not TypeScript `asserts`.
9. **Merged SEED_USERS + E2E_USERS** into one `TEST_USERS` constant.
10. **Add `.env.test`** with local demo keys (already un-ignored in .gitignore).
11. **Cross-reference:** `scripts/seed-production.ts` has hardcoded passwords for seed/test accounts. These are not real people, but passwords should be env-var driven before real users are onboarded (tracked in todo #093).

## Current State

### What exists

**Unit tests (5 files, ~270 cases):** Domain logic — prompt state machine, meeting tiers, slot states, engagement guards, feedback states.

**Integration tests (6 files, ~130 cases):** Service-level — prompt/comment/invitation/meeting/feedback lifecycles + auto-archival. All via typed service interfaces against real Supabase. **Missing cleanup in all files — orphaned data persists after runs.**

**E2E tests (2 files, ~6 flows):**
- `smoke.test.ts` — landing, login, discover, profile, map toggle
- `core-flow.test.ts` — respond → invite → accept → meeting

**Infrastructure:** Playwright Desktop Chrome, `workers: 1`, auth for sophie/tom. Vitest unit + integration. No CI/CD. No `.env.test`.

**Stale test helpers:** `tests/helpers/auth.ts` has `SEED_USERS` referencing `digit`/`other` (old seed data). Current seed has lisa/marco/sophie/tom/ava/ben.

## Items

### 1. Fix integration test cleanup (todo #072)

Integration tests create data that persists, making the app unusable after test runs (feedback gate blocks on orphaned `due` forms).

- [ ] Add `afterAll` cleanup in `tests/integration/feedback-lifecycle.test.ts` — delete feedback_forms, meetings, invitations, comments, slots, prompts via admin client, in FK order
- [ ] Same for `tests/integration/meeting-lifecycle.test.ts` (creates meetings + feedback forms via `advance_scheduled_meetings`)
- [ ] Same for `tests/integration/invitation-lifecycle.test.ts` (creates prompts, slots, comments, invitations)
- [ ] Same for `tests/integration/comment-lifecycle.test.ts` (creates prompts, comments)
- [ ] Add `.throwOnError()` to all cleanup delete chains (silent FK failures leave orphaned data)
- [ ] Verify: `npm run test:integration` succeeds twice in a row without `supabase db reset`
- [ ] Archive `todos/072-pending-p2-integration-test-feedback-cleanup.md`

### 2. Security + test data alignment

Fix before adding CI. These changes must be **atomic** — seed.sql, TEST_USERS, auth.setup.ts, and all test references updated in the same commit.

**Hardcoded key:**
- [ ] `tests/e2e/core-flow.test.ts:6` — remove hardcoded `SERVICE_ROLE_KEY`, import `createAdminClient()` from `tests/helpers/auth.ts`

**Align TEST_USERS with seed.sql (blocking — currently broken):**
- [ ] Replace `SEED_USERS` (digit/other) and `SEED_PROMPTS` with a single `TEST_USERS` constant matching current seed.sql: sophie, tom, lisa, marco, ava, ben — with correct IDs, emails, passwords, usernames
- [ ] Replace `SEED_PROMPTS.other` → `SEED_PROMPTS.marco` (or fold into `TEST_USERS`)
- [ ] Update all 6 integration test files that reference `SEED_USERS`
- [ ] Add E2E storage state paths to `TEST_USERS` (e.g., `tests/.auth/${name}.json`)

**Email domains (unify on `@test.invalid` — RFC 2606):**
- [ ] `supabase/seed.sql` — change all `@dyad.berlin` and `@test.local` emails to `@test.invalid`
- [ ] `tests/auth.setup.ts` — update to match
- [ ] `tests/helpers/auth.ts` — update `TEST_USERS` to match
- [ ] `tests/e2e/core-flow.test.ts` — update any remaining email references

**Localhost assertion guard:**
- [ ] Add `if (!url.startsWith('http://127.0.0.1') && !url.startsWith('http://localhost')) throw new Error(...)` in both `createAdminClient()` and `createAuthenticatedClient()`. Prevents tests running against production.

**`.env.test` with demo keys:**
- [ ] Create `.env.test` with `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for the local demo instance (already un-ignored in .gitignore)

**Add `.throwOnError()` to cleanup deletes:**
- [ ] `core-flow.test.ts` cleanup delete chains (lines ~80-85)

**Cross-references:**
- `todos/093-pending-p2-seed-script-hardcoded-passwords.md` — hardcoded test passwords (separate)
- `scripts/seed-production.ts` has hardcoded `dyad2026!` for seed users — these are test accounts, not real people, but passwords should still be env-var driven before real users are onboarded

### 3. E2E: Signup flow

The onboarding gate — if signup breaks, no new testers can join.

**File:** `tests/e2e/signup.test.ts`

- [ ] `beforeAll`: sweep-delete any user matching `signup-test@test.invalid` (catch orphans from prior crashed runs)
- [ ] Setup: create invitation via admin client (direct insert into `invitations` table — columns: `email`, `token` via `nanoid()`, `expires_at` set to future, `invited_by` = lisa's UUID)
- [ ] Use empty storageState `{ cookies: [], origins: [] }` for unauthenticated context
- [ ] Navigate to `/join?token=<token>`
- [ ] Fill username, email (`signup-test@test.invalid`), password (min 8 chars)
- [ ] Submit → verify redirect to `/discover` (or `/feedback/[id]` if gated — both are valid "auth worked")
- [ ] Verify username displays correctly on discover page
- [ ] Cleanup in `finally`: delete auth user via `admin.auth.admin.deleteUser(userId)`, delete profile, delete invitation
- [ ] File named `signup.responsive.test.ts` so it runs at both desktop and mobile viewports

### 4. CI/CD pipeline

2 CI jobs. Desktop viewport for all E2E tests + inline mobile check in smoke/signup.

#### Multi-viewport Playwright config

**File:** `playwright.config.ts`

3 projects using a file naming convention:
- `*.responsive.test.ts` → runs at all 3 viewports (layout-sensitive tests)
- `*.test.ts` → runs at desktop only (logic-heavy tests)

```
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'desktop',
    testMatch: /e2e\/.*\.test\.ts/,
    use: { viewport: { width: 1280, height: 720 } },
    dependencies: ['setup'] },
  { name: 'mobile',
    testMatch: /e2e\/.*\.responsive\.test\.ts/,
    use: { ...devices['Pixel 7'] },
    dependencies: ['setup'] },
]
```

| Test file | desktop | mobile | Rationale |
|-----------|:---:|:---:|-----------|
| `smoke.responsive.test.ts` | yes | yes | FloatingNav, sidebar, map — layout-sensitive |
| `signup.responsive.test.ts` | yes | yes | Split-layout collapses on mobile |
| `core-flow.test.ts` | yes | — | Logic-heavy, selectors not viewport-dependent |

- [ ] Rename `smoke.test.ts` → `smoke.responsive.test.ts`
- [ ] Name signup test `signup.responsive.test.ts`
- [ ] Add 3 projects to `playwright.config.ts` as above
- [ ] Use `devices['Pixel 7']` for mobile (includes `hasTouch`, `isMobile`, `deviceScaleFactor`)
- [ ] Update `playwright.config.ts` webServer to CI-conditional (build+preview on 4173 vs dev on 5173)
- [ ] Update `baseURL` to match (4173 in CI, 5173 locally)
- [ ] Set `trace: process.env.CI ? 'off' : 'on-first-retry'` with comment: `// SECURITY: Traces capture Authorization headers. Never enable in CI.`

#### GitHub Actions workflow

**File:** `.github/workflows/ci.yml`

**Job 1: `check`** — no Supabase needed, fast feedback (~45s)
- `actions/checkout@v4`
- `actions/setup-node@v4` with `cache: 'npm'`
- `npm ci`
- `npm test` (unit tests)
- `npx svelte-check --threshold error`

**Job 2: `test`** — needs Supabase + Playwright (~3 min)
- `actions/checkout@v4`
- `actions/setup-node@v4` with `cache: 'npm'`
- `supabase/setup-cli@v1`
- `supabase start`
- Parse keys from `supabase status -o env` (not hardcoded)
- `npm ci`
- `npm run test:integration`
- Cache Playwright browsers at `~/.cache/ms-playwright` keyed on `hashFiles('package-lock.json')`
- `npx playwright install --with-deps chromium`
- `npm run test:e2e`
- Upload `playwright-report/` as artifact with `if: ${{ !cancelled() }}`, retention 7 days

**Dependency:** `test` depends on `check` passing (fail fast).

- [ ] Create `.github/workflows/ci.yml`
- [ ] Parse keys from `supabase status -o env`, not inline
- [ ] Add comment: `# WARNING: Never store production keys as repo secrets.`
- [ ] Test: push a branch, verify both jobs pass

**What NOT to optimize yet:**
- Docker image caching for Supabase (save when CI >5 min)
- Parallel test execution (requires data isolation)
- Cross-browser testing (Desktop Chrome sufficient for alpha)
- Multi-viewport Playwright projects (inline mobile context is sufficient)

## Sequencing

```
Item 1 (cleanup fix) ── do FIRST
Item 2 (security + data alignment) ── do FIRST (same commit as seed.sql changes)
Item 4 (CI pipeline) ── do SECOND (with items 1+2 already fixed)
Item 3 (signup E2E) ── do THIRD (first new E2E test, validates CI works)
```

## Acceptance Criteria

- [ ] Integration tests run twice without `supabase db reset`
- [ ] No hardcoded keys or production email domains in test files
- [ ] `TEST_USERS` constant matches current seed.sql (sophie, tom, lisa, marco, ava, ben)
- [ ] Localhost guard prevents non-local Supabase connections
- [ ] GitHub Actions runs check + test on every PR to dev
- [ ] Responsive tests (smoke, signup) pass at both desktop and mobile viewports
- [ ] `.throwOnError()` on all cleanup delete chains

## What This Plan Does NOT Include

- **E2E tests for 3b flows** (discover/archive, meeting cancellation) — write when needed
- **E2E feedback-flow test** — write as a separate item when prioritized
- **Admin panel E2E** — low value for <10 testers, removed
- **`SupabaseClient<Database>` parameterization** — premature, fails loudly anyway
- **3rd viewport (desktop-small)** — 2 viewports (desktop + mobile) sufficient for alpha
- **Visual regression / screenshot comparison**
- **Cross-browser testing**
- **Performance/load testing**
- **Docker image caching in CI**
- **Parallel test execution** — requires data isolation, defer to v0.2

## Sources

- **Session plans:** Session 1 (PR #63), Session 2 (PR #64), Session 3a (PR #65), Session 3b (PR #66), Session 4a (PR #68)
- **Release readiness plan:** `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md`
- **Todo #072:** Integration test feedback cleanup
- **Todo #093:** Seed script hardcoded passwords
- **Existing tests:** `tests/e2e/smoke.test.ts`, `tests/e2e/core-flow.test.ts`, `tests/integration/*.test.ts`
- **Solution docs:** `docs/solutions/architecture/service-layer-and-test-portability-patterns.md`, `docs/solutions/architecture/feedback-gate-middleware-pattern.md`
