# Testing

Three tiers of tests, from fast to slow.

| Tier | Command | What it runs | Needs Supabase? |
|------|---------|--------------|-----------------|
| **Unit** | `npm test` | Vitest against `src/lib/**/*.test.ts` — domain logic, pure helpers, mock-only service tests | no |
| **Integration** | `npm run test:integration:local` | Vitest against `tests/integration/**/*.test.ts` — full service stack against a real Postgres + Supabase Auth + RLS | yes (local) |
| **E2E** | `npm run test:e2e` | Playwright against the dev server — multi-viewport, clicks-in-a-browser | yes (local) |

Use unit tests for logic. Use integration tests when the behaviour only emerges from the interaction with RLS, triggers, RPCs, or GoTrue auth. Use E2E for user journeys that cross navigation boundaries.

## Prerequisites (first-time setup)

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
2. `npm install` (installs `supabase` as a dev dep).
3. `npm run setup` — this starts local Supabase via Docker, runs migrations, seeds test users, **and** writes `.env.local` with the credentials. First run pulls ~6 Docker images (~15 min). Subsequent runs take ~30 s.

`.env.local` is gitignored and holds the local JWT keys — they're demo keys, safe on disk but not committable. Every `npm run setup` re-writes them.

## Integration tests — the everyday loop

```bash
npm run test:integration:local
```

This wraps three steps:
1. `npm run db:env` — re-read `supabase status`, rewrite `.env.local`.
2. `pretest:integration` (hook) — `scripts/check-supabase.sh` verifies Supabase is reachable at `http://127.0.0.1:54321`. Fails fast with setup instructions if not.
3. `npm run test:integration` — Vitest picks up the env, loads the service layer, runs lifecycle tests.

Need just one of those?

| I want to... | Run |
|---|---|
| Rewrite `.env.local` from a running Supabase | `npm run db:env` |
| Confirm Supabase is up (no env rewrite) | `npm run db:health` |
| Reset the DB to seed state between runs | `npm run reset` |
| Run integration tests assuming env is already fresh | `npm run test:integration` |

## Why `.env.local` is generated, not stored

The local Supabase instance re-issues its JWT signing keys on every `supabase start`, so the demo anon/service-role JWTs change. Checking a static `.env.local` into the repo would bake in stale keys that break the first time the CLI version or config changes. `scripts/test-env.sh` pulls the current keys via `supabase status -o env` and remaps the CLI's variable names (`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) to the app's names (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Safety rails

- `tests/helpers/auth.ts` refuses to run if `PUBLIC_SUPABASE_URL` isn't `http://127.0.0.1` or `http://localhost` — integration tests cannot accidentally hit production.
- `scripts/check-supabase.sh` rejects non-localhost URLs for the same reason.
- `.env.local` and `.env.test` are gitignored. `.env.example` and `.env.local.example` are templates and **are** committed; they contain no real keys.

## Seeded test users

From `supabase/seed.sql`, mirrored in `tests/helpers/auth.ts` as `TEST_USERS`:

| Username | Email | Password | Notes |
|----------|-------|----------|-------|
| `lisa` | lisa@test.invalid | password123 | admin |
| `marco` | marco@test.invalid | password123 | |
| `sophie` | sophie@test.invalid | dyad2026! | Playwright — no feedback gate |
| `tom` | tom@test.invalid | dyad2026! | Playwright — no feedback gate |
| `ava` | ava@test.invalid | password123 | has a due feedback form (gated) |
| `ben` | ben@test.invalid | password123 | has a due feedback form (gated) |
| `nina` | nina@test.invalid | password123 | meeting-lifecycle scenarios |
| `kai` | kai@test.invalid | password123 | meeting-lifecycle scenarios |

All emails use `@test.invalid` (RFC 2606 — guaranteed undeliverable).

## CI

`.github/workflows/ci.yml` runs unit + svelte-check on every PR, and integration + E2E on merges into `dev`/`main`. CI uses `supabase/setup-cli@v1` + `supabase start --exclude studio` in a job container, then `eval "$(supabase status -o env)"` to export keys. Same mechanism as local, just automated.

## Writing a new integration test

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import {
	createAuthenticatedClient,
	createAdminClient,
	TEST_USERS
} from '../helpers/auth.js';
import { createServices } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

describe('my feature', () => {
	beforeAll(async () => {
		await cleanTestData(createAdminClient());
	});

	it('does the thing', async () => {
		const client = await createAuthenticatedClient(
			TEST_USERS.lisa.email,
			TEST_USERS.lisa.password
		);
		const services = createServices(client);
		// ...
	});
});
```

File goes in `tests/integration/*.test.ts`. Run it:

```bash
npx vitest run --config vitest.config.integration.ts tests/integration/my-feature.test.ts
```

## Common failures

**"SAFETY: Tests must run against a local Supabase instance"** — your `PUBLIC_SUPABASE_URL` points at prod. Most likely cause: a stray `.env` file from when you pointed dev at remote Supabase. Unset it or run `npm run db:env` to rewrite `.env.local`.

**"Failed to sign in as lisa@test.invalid"** — either Supabase isn't running (check `npm run db:health`) or the seed didn't apply (run `npm run reset`).

**Integration tests hang then time out** — a previous test left orphan data that violates an FK. Run `npm run reset` to restore seed state.

**Migration history diverged** — see the incident captured in issue #108 and `CLAUDE.md` → Database Migrations. Do not apply SQL via the Supabase dashboard; everything goes through a committed migration.
