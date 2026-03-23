-- Track who referred a waitlist contact (username of the member who shared)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referred_by_username TEXT;
