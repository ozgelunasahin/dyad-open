# dyad

Dyad is a social platform intended to provide just enough surface area for people to find one another and coordinate a meeting. The goal is to enable discovery and bridging between filter bubbles, to support diverse and interconnected urban communities, one conversation ata time. A cycle looks like this:

A member writes a conversation prompt (a poem, a question, an essay, anything) and suggests up to 3 times in the coming week and places within Berlin (-for now) when and where they would be open to meet. Another member can write a response, see the meeting times and rough areas, and if they want to, invite to meet at one of those slots. If the author accepts, the exact location is shared and they (can) meet. Both leave feedback before either can use it again.

We are a two-person team (and claude, who didn't write this intro but did work on the rest of the repo) based in Berlin, trying to understand (and practice) what it looks like to build social technologies as civic infrastructure. We have deliberately not built in messaging, recommenders, engagement metrics, or user tracking, and we have tried to make it hard for ourselves to add them later (see [DESIGN.md#structural-commitments](DESIGN.md#structural-commitments)).

We are in a private/public(ask us!) beta, we are working toward steward ownership, and are looking for funding and support. `https://dyad.berlin`. -- fiore and luna

## What this repository contains

The full source for `dyad.berlin` — frontend, server code, database migrations, and tests. Open source under [AGPL-3.0](LICENSE). The platform's structural commitments and design rationale are in [DESIGN.md](DESIGN.md); the architecture and conventions for working in the codebase are in [CLAUDE.md](CLAUDE.md); contribution conventions are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Stack

SvelteKit, Svelte 5 (runes), Supabase (auth + Postgres + storage), TipTap (rich text), Leaflet (map), Cloudflare Pages.

The application identity layer goes through the [upact](https://github.com/prefig/upact) port: a typed contract that binds the application to architectural privacy minima regardless of which substrate handles authentication. Today the substrate is Supabase via [`@prefig/upact-supabase`](https://github.com/prefig/upact-supabase). The threat model and the security implications of decoupling from the substrate are in [SECURITY.md](SECURITY.md).

## Local development

```sh
npm install
npx supabase start          # local Supabase (Docker required)
cp .env.local.example .env.local   # fill in keys from `supabase start` output
npm run dev                  # Vite at localhost:5173
```

## Testing

```sh
npm test                     # unit tests (Vitest)
npm run test:integration     # integration tests (needs local Supabase running)
npx playwright test          # E2E tests (needs dev server + Supabase)
npx svelte-check --threshold error
```

The pre-commit hook runs secrets scanning, ESLint, svelte-check, and unit tests. The pre-push hook runs the E2E suite.

## Deployment

Deployed to Cloudflare Pages via `@sveltejs/adapter-cloudflare`. The admin plane lives at `admin.dyad.berlin` and is gated by Cloudflare Access — see `SECURITY.md` for the authentication model.

Optionally set `PUBLIC_PLAUSIBLE_SCRIPT_SRC` to enable Plausible Analytics (privacy-friendly, EU-hosted, no cookies, no PII; GDPR-clean by design). The value is the full script URL from the Plausible dashboard, e.g. `https://plausible.io/js/pa-XXXXXXXX.js`. Unset means no analytics. See `CLAUDE.md` for the full env-var reference.

```sh
npx supabase db push         # push pending migrations to remote
npx supabase migration list  # compare local vs remote
```

## License

[AGPL-3.0](LICENSE). The name "dyad" and the dyad.berlin wordmark are not licensed for use by derivatives — see [NOTICE](NOTICE).

## Security

Report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
