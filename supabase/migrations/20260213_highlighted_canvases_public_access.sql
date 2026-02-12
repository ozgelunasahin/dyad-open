-- Highlighted canvases (referenced by landing_highlights) are publicly accessible.
-- This allows anonymous users to view canvases, their notes, and card positions
-- when the canvas is featured on the landing page.

-- Allow anyone to view canvases that are in landing_highlights
CREATE POLICY "Anyone can view highlighted canvases"
  ON canvases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_highlights
      WHERE landing_highlights.canvas_id = canvases.id
    )
  );

-- Allow anyone to view notes belonging to highlighted canvases
CREATE POLICY "Anyone can view notes in highlighted canvases"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_highlights
      WHERE landing_highlights.canvas_id = notes.canvas_id
    )
  );

-- Allow anyone to view card positions for highlighted canvases
CREATE POLICY "Anyone can view card positions for highlighted canvases"
  ON card_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM landing_highlights
      WHERE landing_highlights.canvas_id = card_positions.canvas_id
    )
  );
