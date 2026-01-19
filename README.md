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

Create a `.env` file:

```
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## License

MIT
