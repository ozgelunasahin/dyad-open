-- Add cover_image_url column to canvases table
ALTER TABLE canvases
ADD COLUMN cover_image_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN canvases.cover_image_url IS 'URL to cover image displayed as background on landing page canvas sections';
