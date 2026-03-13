ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS expression_url TEXT,
  ADD COLUMN IF NOT EXISTS expression_file_url TEXT;
