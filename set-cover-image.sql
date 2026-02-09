-- Manually set cover image for dyad canvas
-- Run this in Supabase SQL Editor

-- First, find the dyad canvas and extract the image URL from the entry point note
UPDATE canvases
SET cover_image = (
  SELECT
    (content->'content'->0->'content'->0->'attrs'->>'src')::text
  FROM notes
  WHERE notes.canvas_id = canvases.id
    AND notes.slug = canvases.entry_point_note_id
    AND content->'content'->0->>'type' = 'paragraph'
    AND content->'content'->0->'content'->0->>'type' = 'image'
  LIMIT 1
)
WHERE slug = 'dyad'
  AND cover_image IS NULL;

-- Check the result
SELECT id, name, slug, cover_image FROM canvases WHERE slug = 'dyad';
