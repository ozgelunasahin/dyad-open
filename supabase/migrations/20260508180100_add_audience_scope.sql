-- Corner visibility primitive — wire prompts and invitations to scopes.
--
-- Adds:
--   prompts.audience_scope     — NULL = Berlin commons (default); non-null = scoped corner.
--   invitations.scope          — optional scope attached to an email-invite token; the
--                                 signup handler auto-grants this scope on redemption.
--
-- Updates RLS to honor the new visibility model:
--   prompts (anon)             — only commons posts visible to anon (audience_scope IS NULL).
--   prompts (authenticated)    — DELIBERATELY NOT amended. The same policy governs both
--                                 the discover feed and direct-URL conversation detail.
--                                 Filtering at the authenticated layer would break direct-URL
--                                 access for invitees, responders, and meeting participants
--                                 via the FK chain. Listing queries in
--                                 src/lib/services/prompt-query.ts apply the audience filter
--                                 at the application layer instead. This mirrors the
--                                 hidden_at precedent in 20260506130000.
--   time_slots                 — three-branch shape mirrors hidden_at: author always sees
--                                 own; non-author authenticated sees only commons OR scopes
--                                 they hold a non-revoked grant for; meeting participants
--                                 see accepted slots regardless of scope.
--   idx_prompts_discover       — partial index narrowed to also require audience_scope IS NULL,
--                                 which is the dominant query path (commons discover for anon
--                                 and for commons-only authenticated members).
--
-- Downstream tables (prompt_comments, prompt_invitations, meetings) are NOT amended.
-- Their existing policies grant SELECT to FK-chain participants (author, responder,
-- inviter, invitee, meeting participant) regardless of scope state. This preserves
-- the existing two-party visibility for meetings already in flight when a scope is
-- retired or a grant revoked. The trade-off is documented as the R8 question in the
-- plan: an authenticated non-grantee with a UUID can still hit getPromptDetail on a
-- scoped prompt; the bounded-safety promise holds at the listing layer only.
--
-- See plan: prefig/docs/dyad/plans/2026-05-08-001-feat-corner-visibility-primitive-plan.md

-- Step 1: columns.

ALTER TABLE prompts
  ADD COLUMN audience_scope TEXT REFERENCES scopes(scope);

ALTER TABLE invitations
  ADD COLUMN scope TEXT REFERENCES scopes(scope);

-- Step 2: rebuild the partial discover index. Commons discover is the
-- dominant query path; the new partial index narrows to commons posts so the
-- planner can use it for anon and commons-only authenticated discover.
-- Authenticated grantees querying their scoped posts read a small subset that
-- the planner can scan from a different access path; it does not need to be
-- index-covered at alpha scale.

DROP INDEX IF EXISTS idx_prompts_discover;
CREATE INDEX idx_prompts_discover ON prompts(state, region)
  WHERE state = 'published' AND hidden_at IS NULL AND audience_scope IS NULL;

-- Step 3: anon RLS on prompts — scoped posts are not public.

DROP POLICY IF EXISTS "Anyone can read published prompts" ON prompts;
CREATE POLICY "Anyone can read published prompts"
  ON prompts FOR SELECT TO anon
  USING (state = 'published' AND hidden_at IS NULL AND audience_scope IS NULL);

-- Step 4: anon RLS on time_slots — slots of scoped prompts are not public.
-- Preserves the accepted=FALSE safeguarding from
-- 20260409_fix_time_slots_rls_safeguarding.sql and the hidden_at filter from
-- 20260506130000.

DROP POLICY IF EXISTS "Anon reads unaccepted slots of published prompts" ON time_slots;
CREATE POLICY "Anon reads unaccepted slots of published prompts"
  ON time_slots FOR SELECT TO anon
  USING (
    accepted = FALSE
    AND EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.state = 'published'
        AND prompts.hidden_at IS NULL
        AND prompts.audience_scope IS NULL
    )
  );

-- Step 5: authenticated RLS on time_slots — three-branch shape.
-- Authors keep full visibility of their own slots regardless of scope. Meeting
-- participants keep their accepted slot regardless. Non-author non-participant
-- discover-shaped reads gate on scope membership: commons (audience_scope IS
-- NULL) is visible to all; scoped prompts' slots are visible only to grantees.

DROP POLICY IF EXISTS "Authenticated users read slots with safeguarding" ON time_slots;
CREATE POLICY "Authenticated users read slots with safeguarding"
  ON time_slots FOR SELECT TO authenticated
  USING (
    -- Authors always see their own slots.
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.author_id = app.current_user_id()
    )
    OR (
      -- Non-authors see unaccepted slots of published, non-hidden prompts
      -- whose audience the caller belongs to (commons or a granted scope).
      accepted = FALSE
      AND EXISTS (
        SELECT 1 FROM prompts
        WHERE prompts.id = time_slots.prompt_id
          AND prompts.state = 'published'
          AND prompts.hidden_at IS NULL
          AND (
            prompts.audience_scope IS NULL
            OR EXISTS (
              SELECT 1 FROM identity_scopes
              WHERE identity_scopes.identity_id = app.current_user_id()
                AND identity_scopes.scope = prompts.audience_scope
                AND identity_scopes.revoked_at IS NULL
            )
          )
      )
    )
    OR (
      -- Meeting participants see their accepted slot regardless of scope.
      -- Scope retirement or grant revocation must not disrupt scheduled
      -- meetings already in flight.
      accepted = TRUE
      AND EXISTS (
        SELECT 1 FROM meetings
        WHERE meetings.slot_id = time_slots.id
          AND app.current_user_id() IN (meetings.participant_a, meetings.participant_b)
      )
    )
  );
