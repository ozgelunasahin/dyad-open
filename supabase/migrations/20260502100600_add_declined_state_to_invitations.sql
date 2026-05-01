-- Add 'declined' to the prompt_invitations state check constraint.
-- The decline_invitation RPC (introduced in 20260429100000) sets state='declined'
-- but never updated this constraint, causing a check violation at runtime.

ALTER TABLE prompt_invitations
  DROP CONSTRAINT IF EXISTS prompt_invitations_state_check;

ALTER TABLE prompt_invitations
  ADD CONSTRAINT prompt_invitations_state_check
  CHECK (state IN ('pending', 'accepted', 'cancelled', 'expired', 'declined'));
