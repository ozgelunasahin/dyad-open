-- Add nav_note_id to site_canvases so editors can specify which note
-- a nav link should focus when clicked (defaults to canvas entry point)
ALTER TABLE site_canvases ADD COLUMN nav_note_id TEXT;
