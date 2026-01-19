-- Add feature flag for sites publishing
-- Users with can_publish_sites = true can publish canvases as public websites
-- Grant access manually via Supabase dashboard

ALTER TABLE profiles
ADD COLUMN can_publish_sites BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN profiles.can_publish_sites IS
  'Feature flag: user can publish canvases as public sites at /sites/username';
