CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Anyone can submit the contact form (no auth required)
CREATE POLICY "Anyone can submit contact form"
  ON contacts FOR INSERT WITH CHECK (true);

-- Only service role can read contacts
-- (no SELECT policy = no public reads)
