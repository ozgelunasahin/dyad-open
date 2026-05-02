# Contributing to dyad.berlin

## For everyone

dyad is built by a small team with help from AI tooling. Whether you're contributing as a human or as an agent working via Claude Code, the conventions below apply equally.

### Branch workflow

Always work on a branch. Never commit directly to `main`.

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
# ... make changes ...
git push -u origin feat/your-feature-name
gh pr create --base main
```

### Before pushing

```bash
npx svelte-check --threshold error  # must pass — pre-existing errors are known, worry only about new ones
npx vitest run                      # unit tests
npx playwright test                 # E2E tests (requires dev server running)
```

The pre-commit hook runs secrets scanning, ESLint, svelte-check, and unit tests automatically. The pre-push hook runs the E2E suite.

### Test tiers

Three tiers, increasing in setup cost:

- **Unit** — `npm test` / `npx vitest run`. No services, no DB. Pure logic and component tests.
- **Integration** — `npm run test:integration:local`. Hits a real local Supabase stack. Run `npx supabase start` first; `.env.local` is auto-generated from `supabase status` on the first run.
- **E2E** — `npx playwright test`. Needs the dev server running at `localhost:5173` plus local Supabase. Tests the full user flows.

### Commit messages

Follow conventional format: `fix: description`, `feat: description`, `docs: description`, `refactor: description`.

Keep them concise. The commit body should explain *why*, not *what* (the diff shows what).

### CSS: design tokens only

Every CSS value must reference a design token from `src/app.css`. No hardcoded pixel values, colours, or font sizes. See the *Visual system* section of `DESIGN.md` for the catalogue.

```css
/* Yes */
padding: var(--space-4);
font-size: var(--text-md);

/* No */
padding: 16px;
font-size: 14px;
```

### Copy: centralised text

All user-facing text lives in `src/lib/copy.ts`. Don't scatter string literals in components. The file is organised by route.

### Domain language

Internal code uses "prompt" for the conversation starter. User-facing routes and copy use "conversation." See the *Domain language* section of `DESIGN.md` for the full mapping.

---

## For human contributors

### Getting started

```bash
npm install
cp .env.local.example .env.local  # add your Supabase keys
npx supabase start           # local Supabase
npm run dev                  # starts Vite at localhost:5173
```

### Key files to read first

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Architecture guide, route structure, patterns |
| `DESIGN.md` | Design philosophy, structural commitments, domain language, visual system |
| `src/lib/copy.ts` | All user-facing text, organised by route |

---

## For AI agents (Claude Code)

### Context loading

Read `CLAUDE.md` first — it covers the architecture, route structure, service layer pattern, environment variables, and the engineering standards specific to this codebase.

### Patterns to follow

- **Service layer**: All DB access goes through `src/lib/services/`. Don't query Supabase directly from page loaders.
- **Generation counter**: Used in editor auto-save and MapView to prevent stale async results.
- **Copy-on-write**: Svelte 5 runes track by assignment. `Map`/`Set` mutations must create new instances.
- **Response-first flow**: Members must write a response before inviting to meet. The response is the meeting context.
- **FloatingNav per page**: Each page renders its own `FloatingNav` variant. Don't render it from layouts.

### What to check before UI changes

1. Read the *Visual system* and *Components* sections of `DESIGN.md` for tokens and component specs.
2. Use design tokens — never hardcode CSS values.

### Testing

Run the full suite before pushing — the same commands listed above for everyone. See *Test tiers* in the everyone section.
