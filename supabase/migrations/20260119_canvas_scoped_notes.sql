-- Migration: Canvas-Scoped Notes
-- Changes notes from user-scoped (user_id, slug) to canvas-scoped (canvas_id, slug)

BEGIN;

-- 1. Drop old primary key
ALTER TABLE notes DROP CONSTRAINT notes_pkey;

-- 2. Add canvas_id column (nullable initially)
ALTER TABLE notes ADD COLUMN canvas_id TEXT;

-- 3. Populate canvas_id from card_positions (note's "home" canvas)
-- This assigns the note to the first canvas where it appears
UPDATE notes n
SET canvas_id = (
  SELECT cp.canvas_id
  FROM card_positions cp
  WHERE cp.note_id = n.slug
  ORDER BY cp.created_at
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
-- This catches users with notes but no canvases
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM notes WHERE canvas_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % notes have no canvas. Check for users with notes but no canvases.', orphan_count;
  END IF;
END $$;

-- 6. Add NOT NULL constraint and foreign key
ALTER TABLE notes ALTER COLUMN canvas_id SET NOT NULL;
ALTER TABLE notes ADD CONSTRAINT fk_notes_canvas
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE;

-- 7. New primary key: (canvas_id, slug)
ALTER TABLE notes ADD PRIMARY KEY (canvas_id, slug);

-- 8. Keep user_id index for RLS performance (wrap in SELECT for caching)
DROP INDEX IF EXISTS idx_notes_user_id;
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- 9. Add index for canvas lookups
CREATE INDEX idx_notes_canvas_id ON notes(canvas_id);

-- 10. Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Anyone can view notes linked to published canvases" ON notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- 11. Create new RLS policies with canvas-awareness
-- View own notes (performance: use SELECT wrapper for auth.uid() caching)
CREATE POLICY "notes_select_own" ON notes FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- View notes on published canvases (simplified - no need for card_positions join)
CREATE POLICY "notes_select_published" ON notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = notes.canvas_id
    AND c.is_published = TRUE
  )
);

-- Insert own notes
CREATE POLICY "notes_insert" ON notes FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Update own notes
CREATE POLICY "notes_update" ON notes FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Delete own notes
CREATE POLICY "notes_delete" ON notes FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

COMMIT;
