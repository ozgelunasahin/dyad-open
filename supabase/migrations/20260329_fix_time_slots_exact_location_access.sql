-- Fix pre-existing security gap: exact_location readable by any authenticated user
-- via direct time_slots table SELECT.
--
-- Approach: Revoke SELECT on the exact_location column specifically,
-- then grant SELECT on all other columns. This way:
-- - RLS policies still work (row-level filtering needs table-level SELECT)
-- - Authors retain full row access via FOR ALL RLS policy
-- - But no authenticated user can SELECT the exact_location column directly
-- - SECURITY DEFINER functions bypass column grants (they run as postgres)

-- Revoke all SELECT first, then re-grant on specific columns
REVOKE SELECT ON time_slots FROM authenticated;
GRANT SELECT (id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at)
  ON time_slots TO authenticated;

-- Ensure the public view remains accessible
GRANT SELECT ON time_slots_public TO authenticated;
