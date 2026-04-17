-- Allow anyone to insert their own email (public signup form).
-- No SELECT/UPDATE/DELETE for anon — only service role can read the list.
--
-- Original author: applied directly to remote DB before being committed to the
-- repo. Back-filled here so local and remote migration history align.

CREATE POLICY "anyone can subscribe"
  ON newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
