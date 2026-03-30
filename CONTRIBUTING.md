# Contributing to dyad.berlin

## For Everyone

dyad is built by a small team — a developer and a non-technical co-founder — with help from AI agents. Whether you're a human contributor or an AI agent working via Claude Code, these conventions apply equally.

### Branch workflow

Always work on a branch. Never commit directly to `main` or `dev`.

```bash
git checkout dev
git pull origin dev
git checkout -b feat/your-feature-name
# ... make changes ...
git push -u origin feat/your-feature-name
gh pr create --base dev
```

PRs target `dev`. The `main` branch receives merges from `dev` for releases.

### Before pushing

```bash
npx svelte-check --threshold error  # must pass — pre-existing errors are known, worry only about new ones
npx vitest run                      # unit tests
npx playwright test                 # E2E tests (requires dev server running)
```

The pre-commit hook runs secrets scanning, ESLint, svelte-check, and unit tests automatically.

### Commit messages

Follow conventional format: `fix: description`, `feat: description`, `docs: description`, `refactor: description`.

Keep them concise. The commit body should explain *why*, not *what* (the diff shows what).

### CSS: design tokens only

Every CSS value must reference a design token from `src/app.css`. No hardcoded pixel values, colours, or font sizes. Check `docs/design/design-system.md` for the spec.

```css
/* Yes */
padding: var(--space-4);
font-size: var(--text-md);

/* No */
padding: 16px;
font-size: 14px;
```

### Copy: centralized text

All user-facing text lives in `src/lib/copy.ts`. Don't scatter string literals in components. The copy file is organized by route.

### Domain language

Internal code uses "prompt" for the conversation starter. User-facing routes and copy use "conversation." See `docs/design/domain-language.md` for the full mapping.

---

## For Human Contributors

### Getting started

```bash
npm install
cp .env.example .env.local  # add your Supabase keys
npx supabase start           # local Supabase
npm run dev                  # starts Vite at localhost:5173
```

### Key files to read first

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Full architecture guide, route structure, patterns |
| `docs/design/design-principles.md` | Product principles — no pre-meeting contact, feedback gate, etc. |
| `docs/design/design-system.md` | Visual language, tokens, component specs |
| `docs/solutions/` | 24 documented gotchas and patterns — check before implementing |
| `src/lib/copy.ts` | All user-facing text, organized by route |

### Decision making

Check `docs/solutions/` before implementing anything. Past gotchas are documented there: TipTap reactive loop, Leaflet SSR issues, RLS visibility patterns. Don't rediscover what's known.

### Admin operations (alpha test)

- **Invite new users:** Admin panel > Waitlist > click "Invite"
- **View tester feedback:** Admin panel > Feedback
- **View users:** Admin panel > Users
- No database access needed for routine operations

---

## For AI Agents (Claude Code)

### Context loading

Read `CLAUDE.md` — it contains the architecture, route structure, service layer pattern, environment variables, and key files. It's the single source of truth for the codebase.

### Plans and todos

- Plans live in `docs/plans/`. Check for an existing plan before starting work.
- Todos live in `todos/`. Check for related todos before implementing.
- When you complete a plan, move it to `docs/plans/archive/`.
- When you complete a todo, move it to `todos/archive/`.

### Patterns to follow

- **Service layer**: All DB access goes through `src/lib/services/`. Don't query Supabase directly from page loaders.
- **Generation counter**: Used in editor auto-save and MapView to prevent stale async results.
- **Copy-on-write**: Svelte 5 runes track by assignment. `Map`/`Set` mutations must create new instances.
- **Response-first flow**: Users must write a response before inviting to meet. The response IS the meeting context.
- **FloatingNav per page**: Each page renders its own `FloatingNav` variant. Don't render it from layouts.

### What to check before UI changes

1. Check `docs/design/design-system.md` for tokens and specs
2. Check `origin/archive/v01-design-reference` branch for design reference images
3. Check `docs/solutions/` for related gotchas
4. Use design tokens — never hardcode CSS values

### Testing

Run the full suite before pushing:

```bash
npx svelte-check --threshold error
npx vitest run
npx playwright test  # needs dev server at localhost:5173
```

The pre-push hook runs all 26 E2E tests automatically.

### Solution documents

When you solve a non-obvious problem, document it in `docs/solutions/` with this structure:

```markdown
---
topic: Brief description
date: YYYY-MM-DD
prs: [PR numbers]
tags: [relevant, tags]
---

# Title

## Context
## What We Learned
## The Fix / Pattern
## Why This Matters
```

This prevents the same problem from being re-discovered by future contributors (human or AI).
