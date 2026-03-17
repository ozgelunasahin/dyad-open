-- Landing highlights: field notes section on the landing page (max 3 cards)
CREATE TABLE landing_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  link TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anyone can read highlights (public landing page)
ALTER TABLE landing_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON landing_highlights FOR SELECT
  USING (true);

CREATE POLICY "Owner insert"
  ON landing_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner update"
  ON landing_highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner delete"
  ON landing_highlights FOR DELETE
  USING (auth.uid() = user_id);
