-- Add canvas_id to landing_highlights so highlights can reference a canvas directly.
-- When a canvas is highlighted, its name/cover/link are derived automatically.
ALTER TABLE landing_highlights
  ADD COLUMN canvas_id TEXT REFERENCES canvases(id) ON DELETE CASCADE;

-- Index for fast lookup
CREATE INDEX idx_landing_highlights_canvas_id ON landing_highlights(canvas_id);
