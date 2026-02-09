-- Rename cover_image_url to cover_image
ALTER TABLE canvases
RENAME COLUMN cover_image_url TO cover_image;

COMMENT ON COLUMN canvases.cover_image IS 'Supabase Storage path to cover image PNG displayed on landing page';
