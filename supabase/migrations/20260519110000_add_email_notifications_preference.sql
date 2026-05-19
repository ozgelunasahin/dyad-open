-- Profile-level toggle for transactional notification emails (invitations,
-- accepts, declines, meeting cancellations). Default true so existing members
-- receive emails after this lands.
--
-- Extends the column-scoped grants from 20260417100200: authenticated users
-- need to read and write their own `email_notifications` for the profile-page
-- toggle. RLS still scopes UPDATE to the row's owner.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;

GRANT SELECT (email_notifications) ON profiles TO authenticated;
GRANT UPDATE (email_notifications) ON profiles TO authenticated;
