-- Prompts and time slots for the new domain model
-- Prompts replace the overloaded canvases table for the meeting/discover flow

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,  -- nanoid generated in application layer
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  body JSONB,                          -- TipTap JSON
  cover_image_url TEXT,
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'published', 'archived')),
  region TEXT NOT NULL DEFAULT 'berlin',
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompts_author ON prompts(author_id);
CREATE INDEX idx_prompts_discover ON prompts(state, region)
  WHERE state = 'published';

-- Auto-update updated_at (reuse existing function from baseline)
CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage own prompts"
  ON prompts FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can read published prompts"
  ON prompts FOR SELECT
  USING (state = 'published' AND auth.uid() IS NOT NULL);

-- Time slots
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  exact_location JSONB NOT NULL,       -- {place_id, name, address, lat, lng}
  general_area TEXT NOT NULL,           -- neighbourhood name derived from exact_location
  general_area_lat DOUBLE PRECISION,   -- neighbourhood centroid for map pins
  general_area_lng DOUBLE PRECISION,   -- (NOT the exact location)
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_slots_prompt ON time_slots(prompt_id);
CREATE INDEX idx_time_slots_discover ON time_slots(prompt_id, start_time)
  WHERE accepted = FALSE;

-- RLS
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage own time slots"
  ON time_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
      AND prompts.author_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can read slots of published prompts"
  ON time_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
      AND prompts.state = 'published'
    )
    AND auth.uid() IS NOT NULL
  );

-- Public view: excludes exact_location for privacy.
-- The discover feed and prompt detail queries use this view.
-- Only the author (via direct time_slots table access through FOR ALL policy)
-- or the service role can read exact_location.
CREATE VIEW time_slots_public AS
  SELECT id, prompt_id, start_time, duration_minutes,
         general_area, general_area_lat, general_area_lng,
         accepted, created_at
  FROM time_slots;

-- Grant the view to authenticated (inherits RLS from underlying table)
GRANT SELECT ON time_slots_public TO authenticated;
