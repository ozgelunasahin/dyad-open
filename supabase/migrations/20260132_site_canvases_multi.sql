-- Allow same canvas to appear multiple times in a site with different labels/nav targets.
-- Adds surrogate id PK, nav_label column, drops composite PK uniqueness.

BEGIN;

-- Add surrogate ID and nav_label
ALTER TABLE site_canvases ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE site_canvases ADD COLUMN IF NOT EXISTS nav_label TEXT;

-- Populate id for any existing rows that got NULL
UPDATE site_canvases SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE site_canvases ALTER COLUMN id SET NOT NULL;

-- Drop composite PK (allows duplicate canvas_id per site)
ALTER TABLE site_canvases DROP CONSTRAINT site_canvases_pkey;

-- Set id as new PK
ALTER TABLE site_canvases ADD PRIMARY KEY (id);

-- Keep index for lookups
CREATE INDEX IF NOT EXISTS idx_site_canvases_site_canvas ON site_canvases(site_id, canvas_id);

-- Drop the old RPC function that uses ON CONFLICT (site_id, canvas_id)
DROP FUNCTION IF EXISTS update_site_canvases(UUID, TEXT[]);

COMMIT;
