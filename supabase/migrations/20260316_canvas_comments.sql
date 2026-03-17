-- Direct comments on a conversation canvas (no highlight required)
-- Used by the Discover page comment-before-invite flow

CREATE TABLE IF NOT EXISTS canvas_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id  TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE canvas_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read canvas comments"
  ON canvas_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own canvas comments"
  ON canvas_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_canvas_comments_canvas ON canvas_comments (canvas_id);
CREATE INDEX idx_canvas_comments_user   ON canvas_comments (user_id);
