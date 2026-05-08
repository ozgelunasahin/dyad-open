# dyad

A small social platform for in-person conversations between strangers. A member writes a conversation prompt and suggests times and places to meet. Another member responds, privately and only once. The author picks one. They meet in person, and both reflect afterwards. No messaging between them, no feed, one response per prompt.

In alpha in Berlin, EU-hosted, built toward steward ownership rather than VC. `https://dyad.berlin`.

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
