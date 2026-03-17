-- Track who invited whom
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles    ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by   ON profiles (referred_by);
