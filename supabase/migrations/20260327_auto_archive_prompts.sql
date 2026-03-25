-- Auto-archive prompts where all slots are expired or accepted.
-- This function is callable directly (for tests) or via pg_cron in production.
-- To enable the cron schedule later:
--   CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
--   SELECT cron.schedule('archive-stale-prompts', '0 * * * *', 'SELECT archive_stale_prompts()');

CREATE OR REPLACE FUNCTION archive_stale_prompts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH stale AS (
    SELECT p.id
    FROM prompts p
    WHERE p.state = 'published'
    AND NOT EXISTS (
      SELECT 1 FROM time_slots ts
      WHERE ts.prompt_id = p.id
      AND ts.accepted = FALSE
      AND ts.start_time > NOW()
    )
  )
  UPDATE prompts
  SET state = 'archived', archived_at = NOW()
  WHERE id IN (SELECT id FROM stale)
  AND state = 'published';

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;
