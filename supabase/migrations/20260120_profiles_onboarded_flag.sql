-- Migration: Add onboarded flag to profiles
-- Tracks whether user has received their starter canvas (so it's not recreated on delete)

BEGIN;

-- Add onboarded column (default false for new users, true for existing users who already have canvases)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

-- Mark existing users with canvases as onboarded
UPDATE profiles p
SET onboarded = TRUE
WHERE EXISTS (
  SELECT 1 FROM canvases c WHERE c.user_id = p.id
);

COMMIT;
