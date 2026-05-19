-- Profile-level toggle for transactional notification emails (invitations,
-- accepts, declines, meeting cancellations). Default true so existing members
-- receive emails after this lands.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;
