-- Add 'page' as an allowed page_type
ALTER TABLE site_pages DROP CONSTRAINT site_pages_page_type_check;
ALTER TABLE site_pages ADD CONSTRAINT site_pages_page_type_check CHECK (page_type IN ('hero', 'contact', 'page'));
