# dyad.berlin

A platform for facilitating real, in-person conversations between strangers in Berlin. Users write conversation starters, schedule meeting times with locations, and meet for one-on-one conversations. Both participants give feedback afterward — revealed simultaneously.

## Stack

SvelteKit, Svelte 5 (runes), Supabase (auth + Postgres + storage), TipTap (rich text), Leaflet (maps), Cloudflare Pages.

## Development

```sh
npm install
npx supabase start          # local Supabase (Docker required)
npm run dev                  # Vite at localhost:5173
```

Environment variables are in `.env.local` (copy from `.env.example`):

```
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
```

## Testing

```sh
npm test                     # unit tests (Vitest)
npm run test:integration     # integration tests (needs Supabase running)
npx playwright test          # E2E tests (needs dev server + Supabase)
npx svelte-check --threshold error
```

## Deployment

Deployed to **Cloudflare Pages** via `@sveltejs/adapter-cloudflare`.

1. Connect the repo to Cloudflare Pages
2. Build command: `npm run build`, output: `.svelte-kit/cloudflare`
3. Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in Cloudflare dashboard
4. Add the Pages URL to Supabase Auth > URL Configuration (Site URL + Redirect URLs)

### Database migrations

```sh
npx supabase db push         # push pending migrations to remote
npx supabase migration list  # compare local vs remote
```

## Inviting Testers (Alpha)

Email delivery is not yet configured for production. To invite testers during the alpha:

1. Go to the **Admin panel** (`/admin`) — requires admin privileges
2. Navigate to **Waitlist**
3. Click **Invite** next to a user — this generates an invite link
4. **Copy the invite link** and share it directly with the tester (Signal, Telegram, email, in person)
5. The tester opens the link, sets a username and password, and joins

The invite link expires after 7 days.

## Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Architecture guide, route structure, service layer, key patterns |
| `CONTRIBUTING.md` | How to contribute (humans and AI agents) |
| `docs/design/design-principles.md` | Product principles |
| `docs/design/design-system.md` | CSS tokens, typography, spacing |
| `docs/design/domain-language.md` | Internal vs user-facing vocabulary |
| `docs/ROADMAP.md` | v0.1 → v0.2 → v0.3 scope |
| `docs/solutions/` | 34 documented patterns and gotchas |

## License

MIT
