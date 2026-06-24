-- app.has_active_membership(identity) — the gate's read of entitlement state.
--
-- SECURITY DEFINER so it can read `memberships` regardless of the caller's RLS
-- context: it is invoked both from the endpoint check and (via gating_allows,
-- added in U6) inside RLS policy evaluation. It takes the identity explicitly
-- and never calls auth.uid() — the policy-scan drift test cannot see function
-- bodies, so the migration gate greps SECURITY DEFINER bodies for auth.uid().
--
-- `active` is a stored boolean maintained by the webhook (paid lapse/refund)
-- and operator grant/revoke; this function only reads it. No row => not active.

CREATE OR REPLACE FUNCTION app.has_active_membership(p_identity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT COALESCE(
		(SELECT active FROM memberships WHERE identity_id = p_identity_id),
		false
	)
$$;

REVOKE EXECUTE ON FUNCTION app.has_active_membership(UUID) FROM public;
GRANT EXECUTE ON FUNCTION app.has_active_membership(UUID) TO authenticated, service_role;
