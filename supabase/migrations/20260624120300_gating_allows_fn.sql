-- app.gating_allows(action, identity) — the RLS safety net's gate decision.
--
-- Returns TRUE when the action is allowed for the actor: either the action's
-- flag is off/absent in the membership_gating config, OR the actor holds an
-- active membership. So gating-off ⇒ true for everyone ⇒ no behaviour change;
-- this is what lets all three cofounder positions live as configuration (R9).
--
-- SECURITY DEFINER so it can read app_settings (service-role-only, RLS with no
-- policy) and call app.has_active_membership from inside RLS policy evaluation
-- and the accept_invitation RPC body. Takes the identity explicitly; never
-- calls auth.uid() (the migration gate greps DEFINER bodies for it).
--
-- The endpoint check (require-membership.ts) computes the SAME decision in app
-- code from the same app_settings key + active flag — this function is the
-- safety net at the DB layer, the endpoint is the primary, user-facing gate.

CREATE OR REPLACE FUNCTION app.gating_allows(p_action TEXT, p_identity_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	-- Compare to the JSON boolean true rather than casting ->> text to ::boolean:
	-- an absent key OR a malformed (non-boolean) value both read as "not gated"
	-- (gating off) instead of raising inside RLS evaluation. Only literal true
	-- gates the action.
	SELECT
		NOT COALESCE(
			(SELECT (value -> p_action) = 'true'::jsonb FROM app_settings WHERE key = 'membership_gating'),
			false
		)
		OR app.has_active_membership(p_identity_id)
$$;

REVOKE EXECUTE ON FUNCTION app.gating_allows(TEXT, UUID) FROM public;
GRANT EXECUTE ON FUNCTION app.gating_allows(TEXT, UUID) TO authenticated, service_role;
