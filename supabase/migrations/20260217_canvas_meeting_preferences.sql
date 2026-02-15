-- Meeting preferences on conversation canvases
ALTER TABLE canvases ADD COLUMN preferred_location TEXT;
ALTER TABLE canvases ADD COLUMN preferred_time_slots TEXT;
