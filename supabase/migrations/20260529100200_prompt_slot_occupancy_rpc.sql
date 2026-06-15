-- Viewer-safe per-slot occupancy for a prompt's slots (F2 / U9 + U10).
--
-- Non-authors cannot read `meetings` or other members' `prompt_comments` under
-- RLS — the seat count on a slot is therefore invisible to a prospective
-- joiner. This SECURITY DEFINER RPC exposes ONLY a low-resolution occupancy
-- count per slot so the conversation detail page can render a "+N others
-- joining" marker and stop full slots being invitable. It deliberately returns
-- no usernames, no participant UUIDs, no display names, and no location
-- columns — a count is the maximum resolution the journey requires.
--
-- Because SECURITY DEFINER bypasses RLS, this function re-implements every
-- access check that RLS would otherwise apply:
--   * caller must be authenticated (app.current_user_id() IS NOT NULL);
--   * the prompt must be published AND not hidden;
--   * the caller must be in the prompt's audience (commons, i.e.
--     audience_scope IS NULL, OR they hold a non-revoked grant for the scope) —
--     mirrors the audience predicate in 20260508180100_add_audience_scope.sql;
--   * the prompt author may always read their own prompt's occupancy.
-- A caller who fails these checks gets an empty set (no error, no existence
-- leak), matching the get_my_prompt_slots precedent.
--
-- Seat-occupancy predicate is the SAME set used by accept_invitation's capacity
-- cap and cancel_meeting: a meeting occupies a seat when its state is
-- ('scheduled', 'awaiting_feedback'). 'completed' is excluded (it cannot occur
-- on a future, still-invitable slot) and so are cancelled states.

CREATE OR REPLACE FUNCTION get_prompt_slot_occupancy(p_prompt_id TEXT)
RETURNS TABLE (slot_id UUID, occupied INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := app.current_user_id();
BEGIN
  -- Unauthenticated callers get nothing. Grant is to `authenticated` only, but
  -- gate defensively in the body too (search_path is fixed; this is the auth
  -- floor RLS would have enforced).
  IF v_caller IS NULL THEN
    RETURN;
  END IF;

  -- Empty set unless the prompt is readable by this caller. Don't raise — that
  -- would leak whether the prompt id exists.
  IF NOT EXISTS (
    SELECT 1 FROM prompts p
    WHERE p.id = p_prompt_id
      AND (
        -- Author always reads their own prompt's occupancy.
        p.author_id = v_caller
        OR (
          -- Non-authors: published, not hidden, and in the prompt's audience.
          p.state = 'published'
          AND p.hidden_at IS NULL
          AND (
            p.audience_scope IS NULL
            OR EXISTS (
              SELECT 1 FROM identity_scopes
              WHERE identity_scopes.identity_id = v_caller
                AND identity_scopes.scope = p.audience_scope
                AND identity_scopes.revoked_at IS NULL
            )
          )
        )
      )
  ) THEN
    RETURN;
  END IF;

  -- One row per slot of the prompt, with its active-meeting (seat) count.
  -- LEFT JOIN so slots with zero occupancy still return occupied = 0.
  RETURN QUERY
  SELECT ts.id AS slot_id,
         COUNT(m.id)::INTEGER AS occupied
  FROM time_slots ts
  LEFT JOIN meetings m
    ON m.slot_id = ts.id
   AND m.state IN ('scheduled', 'awaiting_feedback')
  WHERE ts.prompt_id = p_prompt_id
  GROUP BY ts.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_prompt_slot_occupancy(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION get_prompt_slot_occupancy(TEXT) TO authenticated;

COMMENT ON FUNCTION get_prompt_slot_occupancy(TEXT) IS
  'Returns (slot_id, occupied) per slot of a prompt — occupied = count of meetings in state (scheduled, awaiting_feedback). Viewer-safe: re-implements auth + published/hidden + audience-scope checks, count-only, no usernames/UUIDs/location. Used for the "+N others joining" marker and full-slot derivation. Returns empty set for unauthorized callers.';
