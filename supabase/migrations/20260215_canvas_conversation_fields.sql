-- Add conversation fields to canvases
ALTER TABLE canvases ADD COLUMN is_conversation BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE canvases ADD COLUMN active_this_week BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index for fast discovery queries
CREATE INDEX idx_canvases_active_conversations
  ON canvases (updated_at DESC)
  WHERE is_conversation = TRUE AND active_this_week = TRUE AND is_published = TRUE;
