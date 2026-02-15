-- Meeting invitations between conversation participants
CREATE TABLE meeting_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT,
  proposed_time TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meeting_invitations_inviter ON meeting_invitations (inviter_id);
CREATE INDEX idx_meeting_invitations_invitee ON meeting_invitations (invitee_id);
CREATE INDEX idx_meeting_invitations_canvas ON meeting_invitations (canvas_id);

-- One active invitation per user-pair per conversation
CREATE UNIQUE INDEX idx_meeting_invitations_unique_pair
  ON meeting_invitations (canvas_id, inviter_id, invitee_id)
  WHERE status = 'pending';

ALTER TABLE meeting_invitations ENABLE ROW LEVEL SECURITY;

-- Both parties can view meeting invitations involving them
CREATE POLICY "View own meeting invitations"
  ON meeting_invitations FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Only the inviter can create
CREATE POLICY "Create meeting invitations"
  ON meeting_invitations FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Both parties can update (invitee accepts/declines, inviter can cancel)
CREATE POLICY "Update own meeting invitations"
  ON meeting_invitations FOR UPDATE
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = inviter_id OR auth.uid() = invitee_id);
