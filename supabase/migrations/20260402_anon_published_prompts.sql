-- Allow anonymous visitors to read published prompts and their time slots.
-- Used by the landing page to show prompt previews without authentication.

-- 1. Base privilege on prompts for anon role (required for RLS policy to take effect)
GRANT SELECT ON prompts TO anon;

-- 2. Anon can only read published prompts
CREATE POLICY "Anyone can read published prompts"
  ON prompts FOR SELECT TO anon
  USING (state = 'published');

-- 3. Column-level grant on time_slots for anon (excludes exact_location,
--    matching the pattern from 20260329_fix_time_slots_exact_location_access.sql)
GRANT SELECT (id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at)
  ON time_slots TO anon;

-- 4. Anon can only read slots belonging to published prompts
CREATE POLICY "Anyone can read slots of published prompts"
  ON time_slots FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
      AND prompts.state = 'published'
    )
  );

-- 5. Grant anon access to the public view (strips exact_location)
GRANT SELECT ON time_slots_public TO anon;

-- 6. Fix view RLS bypass: the view was created by superuser and may bypass RLS.
--    Recreate with security_invoker so it evaluates RLS as the calling role.
DROP VIEW IF EXISTS time_slots_public;
CREATE VIEW time_slots_public
  WITH (security_invoker = true)
  AS SELECT id, prompt_id, start_time, duration_minutes,
            general_area, general_area_lat, general_area_lng,
            accepted, created_at
     FROM time_slots;

-- Re-grant after view recreation
GRANT SELECT ON time_slots_public TO authenticated;
GRANT SELECT ON time_slots_public TO anon;
