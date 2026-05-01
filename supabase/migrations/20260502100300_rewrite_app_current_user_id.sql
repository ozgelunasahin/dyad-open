-- Phase D — D4: Rewrite app.current_user_id() to look up identities instead
-- of delegating to auth.uid() directly.
--
-- For the Supabase substrate, auth.uid() is still called to extract the JWT sub
-- claim — JWT validation remains Supabase's responsibility. The decoupling is in
-- the FK chain (D3) and in this function being the single rewrite point: swapping
-- providers means changing the WHERE clause below and the substrate label, not
-- touching the 20+ RLS policies that call this function.
--
-- Performance: idx_identities_lookup on (substrate, substrate_id) makes this a
-- single index scan. STABLE means Postgres evaluates it once per SQL statement.

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM identities
  WHERE substrate = 'supabase'
    AND substrate_id = (auth.uid())::text
$$;
