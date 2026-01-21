-- Create sites and site_canvases tables for explicit site building
-- Allows users to create sites, select which canvases to include, and publish

BEGIN;

-- Sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug),
  CONSTRAINT sites_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Junction table for site-canvas relationship
CREATE TABLE site_canvases (
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, canvas_id)
);

-- Indexes for RLS policy performance
CREATE INDEX idx_sites_user_id ON sites(user_id);
CREATE INDEX idx_sites_is_published ON sites(is_published);
CREATE INDEX idx_site_canvases_site_id ON site_canvases(site_id);
CREATE INDEX idx_site_canvases_canvas_id ON site_canvases(canvas_id);

-- Auto-increment position trigger
CREATE OR REPLACE FUNCTION set_site_canvas_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position = 0 OR NEW.position IS NULL THEN
    SELECT COALESCE(MAX(position) + 1, 1) INTO NEW.position
    FROM site_canvases WHERE site_id = NEW.site_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_site_canvas_position_trigger
  BEFORE INSERT ON site_canvases
  FOR EACH ROW EXECUTE FUNCTION set_site_canvas_position();

-- Updated_at trigger for sites
CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_canvases ENABLE ROW LEVEL SECURITY;

-- Sites: Separate policies by operation to prevent data leakage
CREATE POLICY "Owner can SELECT own sites" ON sites
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Public can SELECT published sites" ON sites
  FOR SELECT USING (is_published = true);

CREATE POLICY "Owner can INSERT sites" ON sites
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can UPDATE own sites" ON sites
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Owner can DELETE own sites" ON sites
  FOR DELETE USING (user_id = auth.uid());

-- Site_canvases: Must verify BOTH site AND canvas ownership on insert
CREATE POLICY "Owner can SELECT own site_canvases" ON site_canvases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
  );

CREATE POLICY "Public can SELECT published site_canvases" ON site_canvases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.is_published = true)
  );

CREATE POLICY "Owner can INSERT own site_canvases" ON site_canvases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM canvases WHERE canvases.id = site_canvases.canvas_id AND canvases.user_id = auth.uid())
  );

CREATE POLICY "Owner can DELETE own site_canvases" ON site_canvases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
  );

CREATE POLICY "Owner can UPDATE own site_canvases" ON site_canvases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
  );

-- Atomic function to update site canvases (delete + insert in single transaction)
-- This prevents data loss if insert fails after delete
CREATE OR REPLACE FUNCTION update_site_canvases(
  p_site_id UUID,
  p_canvas_ids TEXT[]
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_canvas_id TEXT;
  v_position INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Verify site ownership
  IF NOT EXISTS (
    SELECT 1 FROM sites WHERE id = p_site_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('error', 'Site not found or not owned by user');
  END IF;

  -- Verify all canvases belong to user
  IF array_length(p_canvas_ids, 1) > 0 THEN
    FOR v_canvas_id IN SELECT unnest(p_canvas_ids)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM canvases WHERE id = v_canvas_id AND user_id = v_user_id
      ) THEN
        RETURN json_build_object('error', 'Canvas not found or not owned by user: ' || v_canvas_id);
      END IF;
    END LOOP;
  END IF;

  -- Delete existing associations
  DELETE FROM site_canvases WHERE site_id = p_site_id;

  -- Insert new associations with positions
  IF array_length(p_canvas_ids, 1) > 0 THEN
    v_position := 1;
    FOREACH v_canvas_id IN ARRAY p_canvas_ids
    LOOP
      INSERT INTO site_canvases (site_id, canvas_id, position)
      VALUES (p_site_id, v_canvas_id, v_position)
      ON CONFLICT (site_id, canvas_id) DO UPDATE SET position = v_position;
      v_position := v_position + 1;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true, 'count', COALESCE(array_length(p_canvas_ids, 1), 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
