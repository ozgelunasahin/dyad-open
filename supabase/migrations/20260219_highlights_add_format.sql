-- Add format column to landing_highlights (e.g. 'essay', 'interview')
ALTER TABLE landing_highlights ADD COLUMN format TEXT DEFAULT 'essay';
