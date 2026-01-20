# refactor: Canvas-Scoped Notes

## Overview

Change notes from user-scoped to canvas-scoped. Each canvas has its own isolated notes. Same slug can exist in different canvases with different content.

## Problem

Notes are currently shared across all canvases. Users expect canvas isolation - editing a note on Canvas A shouldn't affect Canvas B.

## Solution

Change primary key from `(user_id, slug)` to `(canvas_id, slug)`. One migration. No UUIDs. No prompts.

## Schema Change

### Current
```sql
CREATE TABLE notes (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  slug TEXT NOT NULL,
  PRIMARY KEY (user_id, slug)
);
```

### After
```sql
CREATE TABLE notes (
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  PRIMARY KEY (canvas_id, slug)
);
```

## Migration

Single atomic migration:

```sql
-- migration: canvas_scoped_notes.sql
BEGIN;

-- 1. Drop old primary key
ALTER TABLE notes DROP CONSTRAINT notes_pkey;

-- 2. Add canvas_id column
ALTER TABLE notes ADD COLUMN canvas_id TEXT;

-- 3. Populate from card_positions (note's "home" canvas)
UPDATE notes n
SET canvas_id = (
  SELECT cp.canvas_id
  FROM card_positions cp
  WHERE cp.note_id = n.slug
  LIMIT 1
);

-- 4. Handle orphan notes (no card_positions) - assign to user's first canvas
UPDATE notes n
SET canvas_id = (
  SELECT c.id FROM canvases c
  WHERE c.user_id = n.user_id
  ORDER BY c.created_at
  LIMIT 1
)
WHERE n.canvas_id IS NULL;

-- 5. Pre-check: fail if any notes still have NULL canvas_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM notes WHERE canvas_id IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: notes exist without a canvas. Check for users with notes but no canvases.';
  END IF;
END $$;

-- 6. Add constraints
ALTER TABLE notes ALTER COLUMN canvas_id SET NOT NULL;
ALTER TABLE notes ADD CONSTRAINT fk_notes_canvas
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE;

-- 7. New primary key
ALTER TABLE notes ADD PRIMARY KEY (canvas_id, slug);

-- 8. Keep user_id index for RLS performance
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- 9. Update RLS policies
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
DROP POLICY IF EXISTS "Anyone can view notes linked to published canvases" ON notes;

CREATE POLICY "notes_select_own" ON notes FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notes_select_published" ON notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = notes.canvas_id
    AND c.is_published = TRUE
  )
);

CREATE POLICY "notes_insert" ON notes FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "notes_update" ON notes FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notes_delete" ON notes FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

COMMIT;
```

## Code Changes

### 1. Types (`src/lib/types/index.ts`)

```typescript
export interface Note {
  id: string;           // Still the slug (human-readable)
  canvasId: string;     // NEW: canvas this note belongs to
  title: string;
  content: JSONContent;
  wikilinks: string[];
}
```

### 2. API - Add canvas_id to requests

**GET notes for canvas** (`src/routes/api/notes/+server.ts`):
```typescript
export async function GET({ url, locals }) {
  const canvasId = url.searchParams.get('canvas_id');
  if (!canvasId) {
    return json({ error: 'canvas_id required' }, { status: 400 });
  }

  const { data, error } = await locals.supabase
    .from('notes')
    .select('*')
    .eq('canvas_id', canvasId);

  return json(data);
}
```

**GET/PUT/DELETE note** (`src/routes/api/notes/[slug]/+server.ts`):
```typescript
export async function GET({ params, url, locals }) {
  const { slug } = params;
  const canvasId = url.searchParams.get('canvas_id');

  const { data } = await locals.supabase
    .from('notes')
    .select('*')
    .eq('canvas_id', canvasId)
    .eq('slug', slug)
    .single();

  return json(data);
}

export async function PUT({ params, url, request, locals }) {
  const { slug } = params;
  const canvasId = url.searchParams.get('canvas_id');
  const body = await request.json();

  const { data, error } = await locals.supabase
    .from('notes')
    .upsert({
      canvas_id: canvasId,
      slug,
      user_id: locals.session.user.id,
      title: body.title,
      content: body.content,
      wikilinks: extractWikilinks(body.content)
    }, {
      onConflict: 'canvas_id,slug'
    });

  return json(data);
}
```

### 3. Store - Pass canvas context

**canvas.svelte.ts** - Add canvasId to API calls:

```typescript
class CanvasStore {
  private canvasId = $state<string | null>(null);

  async initialize(canvasId: string, vault: Vault) {
    this.canvasId = canvasId;
    // ... existing logic
  }

  // Update all fetch calls to include canvas_id
  private async saveNote(noteId: string, content: JSONContent) {
    await fetch(`/api/notes/${noteId}?canvas_id=${this.canvasId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content })
    });
  }
}
```

### 4. Page loader - Load canvas-scoped notes

**+page.server.ts**:
```typescript
// Load only notes for this canvas
const { data: notes } = await supabase
  .from('notes')
  .select('*')
  .eq('canvas_id', canvasId);
```

### 5. Broken link detection - Already canvas-scoped

The vault now only contains notes for the current canvas, so `isLinkBroken()` works unchanged - it checks if slug exists in vault, which is already canvas-filtered.

## Behavior Changes

| Action | Before | After |
|--------|--------|-------|
| Click `[[foo]]` on Canvas A | Opens user's note "foo" | Opens Canvas A's note "foo" |
| Click broken `[[bar]]` | Creates note for user | Creates note in Canvas A |
| Same slug different canvases | Same note (shared) | Different notes (isolated) |
| Delete note on Canvas A | Gone from all canvases | Gone from Canvas A only |

## What We're NOT Building

- ❌ UUID primary keys (composite key works fine)
- ❌ Duplicate wikilink prompts (clicking link opens/creates, simple)
- ❌ Cross-canvas linking syntax (future consideration)
- ❌ New API route structure (just add query param)

## Future: Cross-Canvas Linking

If users want to reference notes from other canvases, we can add later:
- Syntax: `[[canvas-name/note-slug]]` or `[[~other-canvas:note]]`
- "Import note from another canvas" action
- This is additive, doesn't require schema changes

## Acceptance Criteria

- [ ] Notes are isolated per canvas
- [ ] Same slug can exist in different canvases
- [ ] Wikilinks resolve within current canvas only
- [ ] Broken links create notes in current canvas
- [ ] Published canvases show their own notes
- [ ] Migration handles orphan notes gracefully
- [ ] Existing functionality preserved

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/xxx_canvas_scoped_notes.sql` | NEW - migration |
| `src/lib/types/index.ts` | Add `canvasId` to Note interface |
| `src/routes/api/notes/+server.ts` | Require `canvas_id` param |
| `src/routes/api/notes/[slug]/+server.ts` | Add `canvas_id` to queries |
| `src/lib/stores/canvas.svelte.ts` | Pass canvasId in API calls |
| `src/routes/canvas/[canvasId]/+page.server.ts` | Filter notes by canvas |
| `src/routes/[username]/[canvasSlug]/+page.server.ts` | Filter notes by canvas |

## Rollback

If issues arise:
```sql
-- Rollback (data loss warning: notes duplicated to multiple canvases will lose copies)
ALTER TABLE notes DROP CONSTRAINT notes_pkey;
ALTER TABLE notes DROP CONSTRAINT fk_notes_canvas;
ALTER TABLE notes DROP COLUMN canvas_id;
ALTER TABLE notes ADD PRIMARY KEY (user_id, slug);
-- Re-create old RLS policies
```

Or restore from backup (recommended for clean rollback).

## Testing

```sql
-- Pre-migration check: users with notes but no canvases
SELECT n.user_id, COUNT(*) as orphan_notes
FROM notes n
WHERE NOT EXISTS (SELECT 1 FROM canvases c WHERE c.user_id = n.user_id)
GROUP BY n.user_id;

-- Post-migration check: all notes have canvas_id
SELECT COUNT(*) FROM notes WHERE canvas_id IS NULL; -- Should be 0

-- Verify isolation: same slug different canvases
SELECT canvas_id, slug, title FROM notes WHERE slug = 'test-note';
```
