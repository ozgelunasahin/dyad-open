-- Release a consumed group-link redemption — code-review follow-up (U5).
--
-- The join action redeems atomically BEFORE creating the account (so the
-- cap check can never be raced past), which means any post-redeem failure
-- (createUser error, grant/stamp failure with compensating delete) has
-- consumed a cap slot for an account that does not exist. Without a
-- release, a burst of failures silently exhausts a capped conference link
-- and the admin's "Joined X / Y" counter drifts above the real member
-- count.
--
-- GREATEST(..., 0) keeps the counter sane even if a release is ever
-- replayed. service_role only — called by the join action's failure paths
-- through the admin client, best-effort (a failed release only costs cap
-- headroom, which the admin UI already advises).

CREATE OR REPLACE FUNCTION release_group_invite_redemption(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE group_invite_links
  SET redemption_count = GREATEST(redemption_count - 1, 0)
  WHERE token = p_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION release_group_invite_redemption(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION release_group_invite_redemption(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION release_group_invite_redemption(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION release_group_invite_redemption(TEXT) TO service_role;

COMMENT ON FUNCTION release_group_invite_redemption(TEXT) IS
  'Decrements a group link''s redemption_count (floor 0) when a redeemed signup fails after the atomic redeem. Service-role only; called by the join action''s compensation paths.';
