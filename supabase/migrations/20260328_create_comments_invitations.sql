-- Comments and invitations for the engagement layer (Step 4)
-- Comments: private single-shot messages, one per user per prompt
-- Invitations: select one slot, personal message, state machine

-- ============================================
-- PROMPT COMMENTS
-- ============================================

CREATE TABLE prompt_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_one_comment_per_user_per_prompt
    UNIQUE (prompt_id, author_id)
);

CREATE INDEX idx_prompt_comments_prompt ON prompt_comments(prompt_id);

-- Auto-update updated_at (reuse existing function from baseline)
CREATE TRIGGER prompt_comments_updated_at
  BEFORE UPDATE ON prompt_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: two-party visibility (commenter sees own; prompt author sees all on their prompt)
ALTER TABLE prompt_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors manage own comments"
  ON prompt_comments FOR ALL
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Prompt author reads comments"
  ON prompt_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = prompt_comments.prompt_id
      AND prompts.author_id = (SELECT auth.uid())
    )
  );

-- ============================================
-- PROMPT INVITATIONS
-- ============================================

CREATE TABLE prompt_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  invitee_id UUID NOT NULL REFERENCES auth.users(id),
  comment_id UUID REFERENCES prompt_comments(id),
  message TEXT CHECK (message IS NULL OR char_length(message) BETWEEN 1 AND 500),
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'accepted', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- One pending invitation per user per slot (allows re-invitation after cancel/expire)
CREATE UNIQUE INDEX uq_one_pending_invitation_per_user_per_slot
  ON prompt_invitations(slot_id, inviter_id)
  WHERE state = 'pending';

CREATE INDEX idx_prompt_invitations_prompt ON prompt_invitations(prompt_id);
CREATE INDEX idx_prompt_invitations_pending ON prompt_invitations(slot_id, state)
  WHERE state = 'pending';

-- RLS
ALTER TABLE prompt_invitations ENABLE ROW LEVEL SECURITY;

-- Inviter can create, view, and cancel their own invitations
CREATE POLICY "Inviter manages own invitations"
  ON prompt_invitations FOR ALL
  USING ((SELECT auth.uid()) = inviter_id)
  WITH CHECK ((SELECT auth.uid()) = inviter_id);

-- Invitee (prompt author) can only READ — acceptance goes through SECURITY DEFINER RPC
CREATE POLICY "Invitee reads invitations"
  ON prompt_invitations FOR SELECT
  USING ((SELECT auth.uid()) = invitee_id);

-- Enforce invitee is always the prompt author
CREATE OR REPLACE FUNCTION check_invitee_is_prompt_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invitee_id != (SELECT author_id FROM prompts WHERE id = NEW.prompt_id) THEN
    RAISE EXCEPTION 'Invitee must be the prompt author';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER enforce_invitee_is_prompt_author
  BEFORE INSERT ON prompt_invitations
  FOR EACH ROW EXECUTE FUNCTION check_invitee_is_prompt_author();

-- ============================================
-- ACCEPT INVITATION (atomic slot booking)
-- ============================================

CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
  v_invitee_id UUID;
  v_slot_accepted BOOLEAN;
BEGIN
  -- Lock invitation
  SELECT slot_id, invitee_id INTO v_slot_id, v_invitee_id
  FROM prompt_invitations
  WHERE id = p_invitation_id AND state = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or not pending';
  END IF;

  IF v_invitee_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Lock slot and check availability
  SELECT accepted INTO v_slot_accepted
  FROM time_slots WHERE id = v_slot_id FOR UPDATE;

  IF v_slot_accepted THEN
    UPDATE prompt_invitations
    SET state = 'cancelled', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN FALSE;
  END IF;

  -- Book slot + accept invitation atomically
  UPDATE time_slots SET accepted = TRUE WHERE id = v_slot_id;
  UPDATE prompt_invitations
  SET state = 'accepted', resolved_at = NOW()
  WHERE id = p_invitation_id;

  -- Cancel all other pending invitations for this slot
  UPDATE prompt_invitations
  SET state = 'cancelled', resolved_at = NOW()
  WHERE slot_id = v_slot_id AND id != p_invitation_id AND state = 'pending';

  RETURN TRUE;
END;
$$;

-- Restrict execution
REVOKE EXECUTE ON FUNCTION accept_invitation FROM public;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;

-- ============================================
-- EXPIRE STALE INVITATIONS
-- ============================================

CREATE OR REPLACE FUNCTION expire_stale_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE prompt_invitations
  SET state = 'expired', resolved_at = NOW()
  WHERE state = 'pending'
    AND slot_id IN (
      SELECT id FROM time_slots
      WHERE start_time - INTERVAL '12 hours' <= NOW()
    );

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Restrict to service_role only (cron + test admin client)
REVOKE EXECUTE ON FUNCTION expire_stale_invitations FROM public;
GRANT EXECUTE ON FUNCTION expire_stale_invitations TO service_role;
