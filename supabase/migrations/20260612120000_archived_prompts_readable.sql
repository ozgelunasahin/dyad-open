-- Allow authenticated users to read archived prompts.
-- Archived conversations are shown in the constellation view as "from the archives" —
-- they represent conversations that happened and completed, not active invitations.
-- The author-owns policy already covers authors; this extends read access to all members.
CREATE POLICY "Authenticated users can read archived prompts"
  ON prompts FOR SELECT
  USING (state = 'archived' AND app.current_user_id() IS NOT NULL);
