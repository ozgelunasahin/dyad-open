CREATE TABLE site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL CHECK (page_type IN ('hero', 'contact')),
  title TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;

-- Owner can manage their site pages
CREATE POLICY "Owner can SELECT own site_pages"
  ON site_pages FOR SELECT
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = site_pages.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Owner can INSERT own site_pages"
  ON site_pages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sites WHERE sites.id = site_pages.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Owner can UPDATE own site_pages"
  ON site_pages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = site_pages.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Owner can DELETE own site_pages"
  ON site_pages FOR DELETE
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = site_pages.site_id AND sites.user_id = auth.uid()));

-- Public can read pages of published sites
CREATE POLICY "Public can read published site_pages"
  ON site_pages FOR SELECT
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = site_pages.site_id AND sites.is_published = true));
