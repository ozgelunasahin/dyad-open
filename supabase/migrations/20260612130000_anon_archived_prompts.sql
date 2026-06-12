-- Allow anonymous (unauthenticated) visitors to read archived prompts.
-- These are shown on the public landing page as "from the archives" — completed
-- conversations that illustrate what happens on the platform.
GRANT SELECT ON prompts TO anon;

CREATE POLICY "Anyone can read archived prompts"
  ON prompts FOR SELECT TO anon
  USING (state = 'archived');
