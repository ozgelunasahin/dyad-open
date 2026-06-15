-- Atomic group-link redemption — conference-scoped access (U1).
--
-- The cap check and the counter increment happen under a FOR UPDATE row
-- lock so two attendees racing the last slot cannot both pass (the
-- confirm_user_email locking precedent, 20260406). Re-validation happens
-- here at redemption time, not just at page load — a link revoked or
-- exhausted between the two is caught.
--
-- Distinct error messages are contract tokens the join action maps to
-- friendly copy: group_link_not_found / group_link_revoked /
-- group_link_closed / group_link_full. They are never shown to clients raw.
--
-- service_role only: the join action calls this through the server-side
-- admin client. Nothing about group links is callable by anon or
-- authenticated roles.
--
-- See plan: docs/plans/2026-06-05-001-feat-conference-scoped-access-plan.md (U1, R3).

CREATE OR REPLACE FUNCTION redeem_group_invite_link(p_token TEXT)
RETURNS TABLE (scope TEXT, access_expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link group_invite_links%ROWTYPE;
BEGIN
  SELECT * INTO link
  FROM group_invite_links g
  WHERE g.token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_link_not_found';
  END IF;
  IF link.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'group_link_revoked';
  END IF;
  IF NOW() > link.join_closes_at THEN
    RAISE EXCEPTION 'group_link_closed';
  END IF;
  IF link.max_redemptions IS NOT NULL AND link.redemption_count >= link.max_redemptions THEN
    RAISE EXCEPTION 'group_link_full';
  END IF;

  UPDATE group_invite_links g
  SET redemption_count = g.redemption_count + 1
  WHERE g.id = link.id;

  RETURN QUERY SELECT link.scope, link.access_expires_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION redeem_group_invite_link(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION redeem_group_invite_link(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION redeem_group_invite_link(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION redeem_group_invite_link(TEXT) TO service_role;

COMMENT ON FUNCTION redeem_group_invite_link(TEXT) IS
  'Atomically validates and redeems a group invite link (FOR UPDATE row lock on the cap counter). Service-role only; called by the join action via the admin client. Raises group_link_not_found/_revoked/_closed/_full.';
