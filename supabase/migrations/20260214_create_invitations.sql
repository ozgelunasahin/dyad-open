-- Invitation system for alpha launch
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invitations_token ON invitations (token);
CREATE INDEX idx_invitations_email ON invitations (email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- No public access to invitations table — all access goes through RPC functions

-- Validate an invitation token (callable without auth)
CREATE OR REPLACE FUNCTION public.validate_invitation(invite_token TEXT)
RETURNS TABLE(email TEXT, valid BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.email,
    (i.used_at IS NULL AND i.expires_at > now()) AS valid
  FROM invitations i
  WHERE i.token = invite_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark an invitation as used (callable without auth, idempotent)
CREATE OR REPLACE FUNCTION public.use_invitation(invite_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  inv_id UUID;
BEGIN
  SELECT id INTO inv_id
  FROM invitations
  WHERE token = invite_token
    AND used_at IS NULL
    AND expires_at > now();

  IF inv_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE invitations
  SET used_at = now()
  WHERE id = inv_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
