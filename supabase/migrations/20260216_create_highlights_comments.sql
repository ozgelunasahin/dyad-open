-- Highlights: text selections on conversation canvases
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  note_slug TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_highlights_canvas ON highlights (canvas_id);
CREATE INDEX idx_highlights_user ON highlights (user_id);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view highlights on published canvases
CREATE POLICY "View highlights on published canvases"
  ON highlights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = highlights.canvas_id
      AND canvases.is_published = TRUE
    )
  );

-- Users can create highlights on published canvases
CREATE POLICY "Create highlights on published canvases"
  ON highlights FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = highlights.canvas_id
      AND canvases.is_published = TRUE
    )
  );

-- Users can delete their own highlights
CREATE POLICY "Delete own highlights"
  ON highlights FOR DELETE
  USING (auth.uid() = user_id);

-- Comments on highlights
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_highlight ON comments (highlight_id);
CREATE INDEX idx_comments_user ON comments (user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view comments on highlights of published canvases
CREATE POLICY "View comments on published canvases"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM highlights
      JOIN canvases ON canvases.id = highlights.canvas_id
      WHERE highlights.id = comments.highlight_id
      AND canvases.is_published = TRUE
    )
  );

-- Users can create comments on highlights of published canvases
CREATE POLICY "Create comments on published canvases"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM highlights
      JOIN canvases ON canvases.id = highlights.canvas_id
      WHERE highlights.id = comments.highlight_id
      AND canvases.is_published = TRUE
    )
  );

-- Users can delete their own comments
CREATE POLICY "Delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);
