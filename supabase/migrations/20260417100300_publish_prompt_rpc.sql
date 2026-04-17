-- Atomic publish_prompt RPC.
--
-- Previously the app did (insert time_slots) followed by (update prompts SET
-- state='published'). If the state update failed mid-way, a retry re-inserted
-- slots, producing duplicate rows. The rows were harmless until the prompt
-- eventually published, at which point the discover feed showed duplicated
-- times.
--
-- Fix: single SECURITY DEFINER transaction that:
--   1. Verifies ownership, state (draft OR archived), and cover_image_url.
--   2. DELETEs any existing non-accepted time_slots for this prompt. This is
--      the idempotency safety net: if a previous attempt partially inserted
--      slots on this draft/archived prompt, those get removed before we
--      re-insert the current attempt's slots.
--   3. INSERTs the new slots from the JSONB payload.
--   4. UPDATEs the prompt to state='published' with published_at=NOW().
--
-- The app layer still does Nominatim reverse-geocoding up front (Cloudflare
-- Workers can't call external HTTP from inside a Postgres function), then
-- passes the fully-derived slot data as JSONB.
--
-- The archived → published path reuses this RPC (republish); that's why the
-- state guard allows both. The republish action also clears archived_at.

CREATE OR REPLACE FUNCTION publish_prompt(
  p_prompt_id TEXT,
  p_slots JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID;
  v_state TEXT;
  v_cover TEXT;
  v_slot JSONB;
BEGIN
  -- Lock the prompt row
  SELECT author_id, state, cover_image_url
  INTO v_author_id, v_state, v_cover
  FROM prompts
  WHERE id = p_prompt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prompt not found';
  END IF;

  IF v_author_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_state NOT IN ('draft', 'archived') THEN
    RAISE EXCEPTION 'Prompt is not in a publishable state (% -> published not allowed)', v_state;
  END IF;

  IF v_cover IS NULL THEN
    RAISE EXCEPTION 'Cover image is required to publish';
  END IF;

  -- Input guard: at least one slot, at most three
  IF jsonb_array_length(p_slots) = 0 THEN
    RAISE EXCEPTION 'At least one time slot is required';
  END IF;
  IF jsonb_array_length(p_slots) > 3 THEN
    RAISE EXCEPTION 'Cannot exceed 3 time slots per prompt';
  END IF;

  -- Idempotency safety net: clear any non-accepted slots from a previous
  -- partial attempt before re-inserting. Two guards:
  --   1. accepted = FALSE — never delete a slot that booked a meeting.
  --   2. NOT EXISTS in meetings — covers the early-cancellation edge case
  --      where cancel_meeting sets accepted=FALSE on a slot that is still
  --      referenced by a cancelled_early meeting (meetings.slot_id has
  --      RESTRICT on delete, so dropping such a slot would otherwise fail
  --      the republish transaction with an FK violation).
  DELETE FROM time_slots
  WHERE prompt_id = p_prompt_id
    AND accepted = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM meetings WHERE meetings.slot_id = time_slots.id
    );

  -- Insert new slots from the JSONB payload
  FOR v_slot IN SELECT jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO time_slots (
      prompt_id,
      start_time,
      duration_minutes,
      exact_location,
      general_area,
      general_area_lat,
      general_area_lng
    )
    VALUES (
      p_prompt_id,
      (v_slot->>'start_time')::TIMESTAMPTZ,
      (v_slot->>'duration_minutes')::INTEGER,
      v_slot->'exact_location',
      v_slot->>'general_area',
      (v_slot->>'general_area_lat')::DOUBLE PRECISION,
      (v_slot->>'general_area_lng')::DOUBLE PRECISION
    );
  END LOOP;

  -- Transition state. archived_at is cleared so a republish lands cleanly.
  UPDATE prompts
  SET state = 'published',
      published_at = NOW(),
      archived_at = NULL
  WHERE id = p_prompt_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION publish_prompt(TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION publish_prompt(TEXT, JSONB) TO authenticated;
