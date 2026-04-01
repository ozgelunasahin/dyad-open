-- Store the self-described motivation from referral signups.
-- Captured on the share page before the person has seen the app.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_motivation text;
