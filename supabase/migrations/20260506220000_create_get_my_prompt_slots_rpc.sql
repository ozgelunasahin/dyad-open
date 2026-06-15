-- Author-only access path to full slot data (including exact_location).
--
-- Background: authenticated users have no SELECT GRANT on the base time_slots
-- table — the access path is the time_slots_public view, which masks
-- exact_location for privacy of non-authors browsing the discover feed. That
-- mask is correct for non-authors but incidentally hides the field from
-- authors too, which breaks UI flows that need the author's own LocationRef
-- (publish-sheet pre-fill, slot edits that don't re-pick location, etc.).
--
-- This RPC gives the author a path to read their own slots' full data without
-- weakening the public view's privacy contract. SECURITY DEFINER runs with
-- the function owner's privileges (which include SELECT on time_slots), and
-- the body checks that the caller is the prompt's author before returning
-- rows. Non-authors get an empty set — no error, no existence leak.
--
-- Mirrors the existing get_meeting_with_location pattern for post-accept
-- exact_location reveal to meeting participants.

CREATE OR REPLACE FUNCTION get_my_prompt_slots(p_prompt_id TEXT)
RETURNS SETOF time_slots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Empty set when caller is not the prompt's author. Don't raise — that
  -- would leak whether the prompt id exists at all.
  IF NOT EXISTS (
    SELECT 1 FROM prompts
    WHERE id = p_prompt_id
      AND author_id = app.current_user_id()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM time_slots
  WHERE prompt_id = p_prompt_id
  ORDER BY start_time;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_my_prompt_slots(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION get_my_prompt_slots(TEXT) TO authenticated;

COMMENT ON FUNCTION get_my_prompt_slots(TEXT) IS
  'Returns full time_slots rows (including exact_location) for the caller''s own prompts. Returns empty set for non-authors. Used by the editor loader to pre-fill the publish sheet without weakening the time_slots_public privacy mask.';
