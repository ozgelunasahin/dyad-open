-- Add 'report' to the feedback.type CHECK constraint so users can flag
-- inappropriate content (conversations, responses, profile bios) through
-- the same in-app feedback surface. Keeps triage on a single table.

ALTER TABLE feedback
  DROP CONSTRAINT IF EXISTS feedback_type_check;

ALTER TABLE feedback
  ADD CONSTRAINT feedback_type_check
  CHECK (type = ANY (ARRAY['bug'::text, 'feature'::text, 'report'::text, 'other'::text]));
