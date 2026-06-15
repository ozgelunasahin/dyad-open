-- Drift fix: publish_prompt RPC was written after the
-- auth.uid() -> app.current_user_id() port and copy-pasted the older idiom.
-- Replace the direct auth.uid() call with the wrapper so the identity layer
-- stays a single swap point. Function body otherwise unchanged.

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
  v_existing_valid_count INTEGER;
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

  IF v_author_id != app.current_user_id() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_state != 'draft' THEN
    RAISE EXCEPTION 'Prompt is not in a publishable state (% -> published not allowed)', v_state;
  END IF;

  IF v_cover IS NULL THEN
    RAISE EXCEPTION 'Cover image is required to publish';
  END IF;

  -- Slot input handling — two modes:
  --   p_slots empty: trust existing future-valid slots on the row (the
  --     re-publish-from-unpublished-draft path). Validate ≥1 such slot
  --     exists; otherwise refuse.
  --   p_slots non-empty: replace non-accepted-non-meeting-bound slots
  --     (the first-publish or slot-replacing-republish path).
  IF jsonb_array_length(p_slots) = 0 THEN
    -- Re-publish path: confirm the row already has a valid future slot.
    SELECT COUNT(*) INTO v_existing_valid_count
    FROM time_slots
    WHERE prompt_id = p_prompt_id
      AND accepted = FALSE
      AND start_time > NOW();

    IF v_existing_valid_count = 0 THEN
      RAISE EXCEPTION 'At least one future-valid slot is required';
    END IF;
  ELSE
    -- First-publish or slot-replacing path.
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
  END IF;

  -- Transition state. published_at is set on first publish, preserved on
  -- subsequent re-publishes (unpublish → republish does not reset it).
  UPDATE prompts
  SET state = 'published',
      published_at = COALESCE(published_at, NOW())
  WHERE id = p_prompt_id;
END;
$$;
