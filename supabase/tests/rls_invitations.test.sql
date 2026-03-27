-- pgTAP tests for prompt_invitations RLS policies
-- Inviter: full access to own invitations
-- Invitee: read-only (mutations through SECURITY DEFINER)
-- Uses specific seed data, not counts (integration tests may leave data behind)

BEGIN;
SELECT plan(7);

-- ============================================
-- Test as digit (inviter of seed invitation on other's prompt)
-- ============================================
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 1. Inviter can see their own seed invitation
SELECT isnt_empty(
  $$ SELECT * FROM prompt_invitations
     WHERE prompt_id = 'seed-prompt-other'
     AND inviter_id = '11111111-1111-1111-1111-111111111111' $$,
  'Inviter can see their own invitations'
);

-- 2. Inviter sees only their own invitations (not ones addressed to them as invitee)
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompt_invitations
     WHERE inviter_id != '11111111-1111-1111-1111-111111111111'
     AND invitee_id != '11111111-1111-1111-1111-111111111111' $$,
  $$ VALUES (0) $$,
  'Inviter cannot see unrelated invitations'
);

-- ============================================
-- Test as otherperson (invitee = prompt author of seed-prompt-other)
-- ============================================
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

-- 3. Invitee can read invitations on their prompts
SELECT isnt_empty(
  $$ SELECT * FROM prompt_invitations
     WHERE invitee_id = '22222222-2222-2222-2222-222222222222'
     AND prompt_id = 'seed-prompt-other' $$,
  'Invitee can read invitations addressed to them'
);

-- 4. Invitee CANNOT update invitations directly (FOR SELECT only)
SELECT lives_ok(
  $$ UPDATE prompt_invitations SET state = 'accepted'
     WHERE invitee_id = '22222222-2222-2222-2222-222222222222'
     AND prompt_id = 'seed-prompt-other' $$,
  'Direct update by invitee does not throw'
);
SELECT results_eq(
  $$ SELECT state FROM prompt_invitations
     WHERE invitee_id = '22222222-2222-2222-2222-222222222222'
     AND prompt_id = 'seed-prompt-other'
     LIMIT 1 $$,
  $$ VALUES ('pending'::text) $$,
  'Invitation state unchanged after unauthorized direct update by invitee'
);

-- 5. Invitee CANNOT delete invitations directly
SELECT lives_ok(
  $$ DELETE FROM prompt_invitations
     WHERE invitee_id = '22222222-2222-2222-2222-222222222222'
     AND prompt_id = 'seed-prompt-other' $$,
  'Direct delete by invitee does not throw'
);
SELECT isnt_empty(
  $$ SELECT * FROM prompt_invitations
     WHERE invitee_id = '22222222-2222-2222-2222-222222222222'
     AND prompt_id = 'seed-prompt-other' $$,
  'Invitation still exists after unauthorized delete attempt by invitee'
);

SELECT * FROM finish();
ROLLBACK;
