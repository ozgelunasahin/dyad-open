-- Archive support for canvases
ALTER TABLE canvases ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
