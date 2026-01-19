# dyad.berlin

A reading environment where markdown notes unfold onto a 2D canvas. Click [[wikilinks]] to spawn connected note cards that expand outward, preserving context while exploring non-linear thought.

## Features

- **Wikilink navigation**: Type `[[` to create links between notes
- **Spatial layout**: Cards spawn from their source link, creating visual trails of exploration
- **Reading zone**: New cards appear in an optimal reading position (left third of screen)
- **Canvas publishing**: Share your canvases with a human-readable URL (`dyad.berlin/username/canvas-name`)
- **Light/dark mode**: Follows browser preference, with manual toggle

## Tech Stack

- **Frontend**: SvelteKit, Svelte 5 (runes), TypeScript
- **Editor**: Tiptap with custom wikilink extension
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: CSS custom properties for theming

## Development

```sh
# Install dependencies
npm install

# Start Supabase locally
npx supabase start

# Start dev server
npm run dev
```

## Database Setup

Run `supabase-setup.sql` in your Supabase SQL editor to create the required tables, RLS policies, and triggers.

## Environment Variables

Create a `.env` file for local development:

```
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

The app is deployed to **Cloudflare Pages** using `@sveltejs/adapter-cloudflare`.

### Cloudflare Pages Setup

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `.svelte-kit/cloudflare`
4. Add environment variables in Cloudflare dashboard:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`

### Production Supabase

For production, update your Supabase project settings:
- Add your Cloudflare Pages URL to **Authentication > URL Configuration > Site URL**
- Add it to **Redirect URLs** for OAuth flows

## License

MIT
