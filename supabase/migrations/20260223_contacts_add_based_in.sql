-- Add based_in column for waitlist location field (PR #23 finding 043)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS based_in TEXT;
