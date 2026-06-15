-- Close the R8 corner gap: amend authenticated SELECT on prompts to gate
-- scoped reads on scope membership. Direct-URL access to a non-NULL
-- audience_scope prompt now requires a non-revoked grant in identity_scopes.
--
-- Rationale: PR 28 (migration 20260508180100) deliberately mirrored the
-- hidden_at precedent and left authenticated SELECT untouched. That made the
-- bounded-safety promise listing-bounded only — a non-grantee with a prompt
-- UUID could still read it via getPromptDetail. The corner pitch ("only your
-- group sees, responds, and meets") needs detail-bounded enforcement to be
-- structurally truthful, especially for safety-shaped corners.
--
-- Why the corner case differs from hidden_at:
--   - hidden_at is admin moderation; preserving direct-URL access for
--     invitees / responders / meeting participants is desirable (a hide
--     should not break in-flight engagement).
--   - audience_scope is curatorial admission; the bounded-safety promise IS
--     the value proposition. Stricter enforcement is the design intent.
--
-- What this changes:
--   - Authenticated SELECT on prompts now requires either commons-or-grantee.
--   - Authors continue to see their own prompts via the existing
--     "Authors can manage own prompts" FOR ALL policy (combines OR with this
--     SELECT policy at evaluation time).
--   - Downstream tables (prompt_comments, prompt_invitations, meetings) keep
--     their existing FK-chain policies. A non-grantee who participated before
--     scope assignment or before grant revocation retains access to their
--     engagement records (the meeting they attended, the response they wrote)
--     but cannot re-read the prompt. This preserves in-flight safety while
--     enforcing the discoverability gate.
--
-- See plan: prefig/docs/dyad/plans/2026-05-08-001-feat-corner-visibility-primitive-plan.md (R8 closure).

DROP POLICY IF EXISTS "Authenticated users can read published prompts" ON prompts;
CREATE POLICY "Authenticated users can read published prompts"
  ON prompts FOR SELECT TO authenticated
  USING (
    state = 'published'
    AND (
      audience_scope IS NULL
      OR EXISTS (
        SELECT 1 FROM identity_scopes
        WHERE identity_scopes.identity_id = app.current_user_id()
          AND identity_scopes.scope = prompts.audience_scope
          AND identity_scopes.revoked_at IS NULL
      )
    )
  );
