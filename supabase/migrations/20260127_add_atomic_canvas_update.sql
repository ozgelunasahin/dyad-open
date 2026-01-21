-- Add atomic function for site canvas updates and missing UPDATE policy
-- This fixes P1 data integrity issues identified in code review

BEGIN;

-- Add missing UPDATE policy for site_canvases (allows position reordering)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owner can UPDATE own site_canvases' AND tablename = 'site_canvases'
  ) THEN
    CREATE POLICY "Owner can UPDATE own site_canvases" ON site_canvases
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
      );
  END IF;
END
$$;

-- Atomic function to update site canvases (delete + insert in single transaction)
-- This prevents data loss if insert fails after delete
CREATE OR REPLACE FUNCTION update_site_canvases(
  p_site_id UUID,
  p_canvas_ids TEXT[]
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_canvas_id TEXT;
  v_position INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Verify site ownership
  IF NOT EXISTS (
    SELECT 1 FROM sites WHERE id = p_site_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('error', 'Site not found or not owned by user');
  END IF;

  -- Verify all canvases belong to user
  IF array_length(p_canvas_ids, 1) > 0 THEN
    FOR v_canvas_id IN SELECT unnest(p_canvas_ids)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM canvases WHERE id = v_canvas_id AND user_id = v_user_id
      ) THEN
        RETURN json_build_object('error', 'Canvas not found or not owned by user: ' || v_canvas_id);
      END IF;
    END LOOP;
  END IF;

  -- Delete existing associations
  DELETE FROM site_canvases WHERE site_id = p_site_id;

  -- Insert new associations with positions
  IF array_length(p_canvas_ids, 1) > 0 THEN
    v_position := 1;
    FOREACH v_canvas_id IN ARRAY p_canvas_ids
    LOOP
      INSERT INTO site_canvases (site_id, canvas_id, position)
      VALUES (p_site_id, v_canvas_id, v_position)
      ON CONFLICT (site_id, canvas_id) DO UPDATE SET position = v_position;
      v_position := v_position + 1;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true, 'count', COALESCE(array_length(p_canvas_ids, 1), 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
