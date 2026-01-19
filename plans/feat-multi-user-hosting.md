# feat: Multi-User Hosting with Supabase + Cloudflare

## Overview

Migrate dyad.berlin from SQLite-based local storage to a production-ready multi-user architecture using:
- **Supabase** - PostgreSQL database, authentication, file storage
- **Cloudflare Pages** - Edge deployment with SvelteKit adapter

## Problem Statement

**Current state (broken for multi-user):**
- All users share a single `static/vault/index.json` file
- `/api/notes/[slug]` modifies global vault without user isolation
- Images upload to shared `static/uploads/` directory
- SQLite requires server filesystem (incompatible with edge/serverless)
- Custom auth implementation to maintain

**Result:** Any authenticated user can see and modify any other user's notes.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Cloudflare     │────▶│   Supabase      │     │   Supabase      │
│  Pages (Edge)   │     │   PostgreSQL    │     │   Storage       │
│                 │     │   + RLS         │     │   (images)      │
│  SvelteKit App  │────▶│   Auth          │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Benefits
- **Zero infrastructure** - No servers, containers, or file systems to manage
- **Automatic scaling** - Edge deployment handles traffic spikes
- **Built-in auth** - Supabase Auth with email/password, OAuth, magic links
- **Row Level Security** - Database enforces user isolation, not application code
- **Global CDN** - Cloudflare's edge network for low latency

---

## Database Schema (PostgreSQL)

### Notes Table

```sql
CREATE TABLE notes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  wikilinks TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);

-- Index for listing user's notes
CREATE INDEX notes_user_id_idx ON notes(user_id);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
```

### Row Level Security Policies

```sql
-- Users can only see their own notes
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert notes for themselves
CREATE POLICY "Users can create own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own notes
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);
```

### Canvases Table Update

```sql
-- Update existing canvases to reference Supabase auth.users
ALTER TABLE canvases
  DROP CONSTRAINT canvases_user_id_fkey,
  ADD CONSTRAINT canvases_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own canvases"
  ON canvases FOR ALL
  USING (auth.uid() = user_id);
```

### Storage Bucket for Images

```sql
-- Create bucket for user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true);

-- Users can upload to their own folder
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read for all images (needed for canvas viewing)
CREATE POLICY "Images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Implementation

### Phase 1: Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
```

```typescript
// src/hooks.server.ts
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => {
          event.cookies.set(key, value, { ...options, path: '/' });
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: '/' });
        },
      },
    }
  );

  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    if (!session) return { session: null, user: null };

    const { data: { user }, error } = await event.locals.supabase.auth.getUser();
    if (error) return { session: null, user: null };

    return { session, user };
  };

  return resolve(event);
};
```

### Phase 2: Notes API (Server-Side)

```typescript
// src/routes/api/notes/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// List all notes for current user
export const GET: RequestHandler = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  // RLS automatically filters to user's notes
  const { data: notes, error } = await locals.supabase
    .from('notes')
    .select('slug, title, content, wikilinks')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load notes:', error);
    return json({ error: 'Failed to load notes' }, { status: 500 });
  }

  return json(notes);
};
```

```typescript
// src/routes/api/notes/[slug]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { data: note, error } = await locals.supabase
    .from('notes')
    .select('title, content')
    .eq('slug', params.slug)
    .single();

  if (error || !note) {
    return json({ error: 'Note not found' }, { status: 404 });
  }

  return json(note);
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content } = await request.json();

  // Validate content structure
  const contentError = validateJSONContent(content);
  if (contentError) {
    return json({ error: contentError }, { status: 400 });
  }

  const wikilinks = extractWikilinks(content);

  const { error } = await locals.supabase
    .from('notes')
    .upsert({
      user_id: user.id,
      slug: params.slug,
      title,
      content,
      wikilinks,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,slug'
    });

  if (error) {
    console.error('Failed to save note:', error);
    return json({ error: 'Failed to save note' }, { status: 500 });
  }

  return json({ success: true, saved: new Date().toISOString() });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await locals.supabase
    .from('notes')
    .delete()
    .eq('slug', params.slug);

  if (error) {
    return json({ error: 'Failed to delete note' }, { status: 500 });
  }

  return json({ success: true });
};
```

### Phase 3: Image Upload to Supabase Storage

```typescript
// src/routes/api/upload/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST: RequestHandler = async ({ request, locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ error: 'Invalid file type' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const ext = file.type.split('/')[1];
  const filename = `${user.id}/${nanoid()}.${ext}`;

  const { error } = await locals.supabase.storage
    .from('uploads')
    .upload(filename, file, {
      cacheControl: '31536000', // 1 year cache
      upsert: false
    });

  if (error) {
    console.error('Upload failed:', error);
    return json({ error: 'Failed to upload file' }, { status: 500 });
  }

  const { data: { publicUrl } } = locals.supabase.storage
    .from('uploads')
    .getPublicUrl(filename);

  return json({ url: publicUrl });
};
```

### Phase 4: Authentication Pages

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession();
  if (session) throw redirect(303, '/');
};

export const actions: Actions = {
  login: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return fail(400, { message: error.message });
    }

    throw redirect(303, '/');
  },

  signup: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return fail(400, { message: error.message });
    }

    return { message: 'Check your email to confirm your account' };
  },

  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/login');
  }
};
```

```typescript
// src/routes/auth/callback/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');

  if (code) {
    await locals.supabase.auth.exchangeCodeForSession(code);
  }

  throw redirect(303, '/');
};
```

### Phase 5: Frontend Vault Loading

```typescript
// src/lib/stores/canvas.svelte.ts

// Replace static vault import with API fetch
async function loadVault(): Promise<Vault> {
  const response = await fetch('/api/notes');
  if (!response.ok) throw new Error('Failed to load notes');

  const notesArray = await response.json();

  return {
    entryPoint: notesArray[0]?.slug ?? null,
    notes: Object.fromEntries(
      notesArray.map((n: { slug: string; title: string; content: JSONContent; wikilinks: string[] }) => [
        n.slug,
        { id: n.slug, title: n.title, content: n.content, wikilinks: n.wikilinks }
      ])
    )
  };
}
```

### Phase 6: Cloudflare Pages Deployment

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};

export default config;
```

```bash
# Environment variables in Cloudflare Pages dashboard
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Migration Plan

### Step 1: Create Supabase Project

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL migrations for `notes` table and RLS policies
3. Create `uploads` storage bucket with policies
4. Configure authentication settings

### Step 2: Migrate Existing Data

```typescript
// scripts/migrate-to-supabase.ts
import { createClient } from '@supabase/supabase-js';
import vault from '../static/vault/index.json';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role bypasses RLS
);

async function migrate(targetUserId: string) {
  const notes = Object.entries(vault.notes).map(([slug, note]) => ({
    user_id: targetUserId,
    slug,
    title: note.title,
    content: note.content,
    wikilinks: note.wikilinks || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('notes')
    .upsert(notes, { onConflict: 'user_id,slug' });

  if (error) throw error;
  console.log(`Migrated ${notes.length} notes`);
}
```

### Step 3: Deploy to Cloudflare

```bash
npm install @sveltejs/adapter-cloudflare
npm run build

# Connect GitHub repo to Cloudflare Pages
# Set environment variables
# Deploy
```

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `@supabase/supabase-js`, `@supabase/ssr`, replace `adapter-auto` with `adapter-cloudflare` |
| `svelte.config.js` | Switch to adapter-cloudflare |
| `src/hooks.server.ts` | Replace custom auth with Supabase client |
| `src/app.d.ts` | Update `Locals` types for Supabase |
| `src/lib/supabase.ts` | New file - Supabase client |
| `src/routes/api/notes/*` | Rewrite with Supabase queries |
| `src/routes/api/upload/+server.ts` | Use Supabase Storage |
| `src/routes/login/+page.server.ts` | Supabase Auth actions |
| `src/routes/auth/callback/+server.ts` | New - OAuth callback |
| `src/lib/stores/canvas.svelte.ts` | Fetch vault from API |

## Files to Delete

| File | Reason |
|------|--------|
| `src/lib/server/db/` | No longer using SQLite/Drizzle |
| `drizzle/` | No migrations needed |
| `drizzle.config.ts` | Drizzle config |
| `static/vault/index.json` | Notes now in Supabase |
| `data/` | SQLite database |

---

## Environment Variables

```bash
# .env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# For migration script only (never expose in client)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] Each user has isolated notes (RLS enforced)
- [ ] Creating a note assigns it to current user
- [ ] Editing works only on own notes
- [ ] Images upload to Supabase Storage with user path
- [ ] Published canvases only show canvas owner's notes
- [ ] Auth via Supabase (email/password)

### Non-Functional Requirements
- [ ] Deploys to Cloudflare Pages
- [ ] No server to maintain
- [ ] No file system dependencies
- [ ] Works globally via edge network

### Security Requirements
- [ ] RLS policies prevent cross-user access
- [ ] Storage policies enforce user-scoped uploads
- [ ] No service role key exposed to client

---

## Implementation Order

| Phase | Tasks | Estimate |
|-------|-------|----------|
| 1 | Supabase project setup, schema, RLS policies | 1-2 hours |
| 2 | Supabase client setup in SvelteKit | 1 hour |
| 3 | Replace notes API with Supabase queries | 2-3 hours |
| 4 | Replace upload API with Supabase Storage | 1 hour |
| 5 | Auth pages with Supabase Auth | 2 hours |
| 6 | Frontend vault loading from API | 1 hour |
| 7 | Migrate existing data | 30 min |
| 8 | Switch to adapter-cloudflare, deploy | 1 hour |
| **Total** | | **~10 hours** |

---

## References

### Supabase Documentation
- [SvelteKit Integration](https://supabase.com/docs/guides/getting-started/quickstarts/sveltekit)
- [Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/sveltekit)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)

### Cloudflare Documentation
- [SvelteKit Adapter](https://svelte.dev/docs/kit/adapter-cloudflare)
- [Pages Deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-a-svelte-kit-site/)
