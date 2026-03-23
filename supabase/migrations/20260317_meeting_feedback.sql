-- Post-meeting feedback: did you meet, how was it, trust tags
CREATE TABLE IF NOT EXISTS meeting_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meeting_invitations(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  did_meet    BOOLEAN NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, reviewer_id)
);

ALTER TABLE meeting_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON meeting_feedback FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can read feedback they gave or received"
  ON meeting_feedback FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

CREATE INDEX idx_meeting_feedback_reviewee ON meeting_feedback (reviewee_id);
CREATE INDEX idx_meeting_feedback_meeting  ON meeting_feedback (meeting_id);
