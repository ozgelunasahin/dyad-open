-- Allow authenticated users to insert notifications (needed for meeting invite/response flows)
CREATE POLICY "Insert notifications for authenticated users"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
