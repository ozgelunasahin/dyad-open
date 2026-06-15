-- Newsletter subscribers collected via dyad.berlin signup forms.
-- Emails are exported as CSV and imported into Substack manually.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text NOT NULL UNIQUE,
    source      text NOT NULL DEFAULT 'website', -- 'website' | 'waitlist'
    consented_at timestamptz NOT NULL DEFAULT now(),
    exported_at  timestamptz  -- set when included in a Substack CSV export
);

-- Only the service role can read/write; anon and authenticated users cannot.
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- No RLS policies: only service role (used by API routes) has access.
