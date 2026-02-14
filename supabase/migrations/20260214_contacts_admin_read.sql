-- Allow admin users (can_publish_sites) to read contacts for waitlist management
CREATE POLICY "Admins can view contacts"
  ON contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_publish_sites = TRUE
    )
  );
