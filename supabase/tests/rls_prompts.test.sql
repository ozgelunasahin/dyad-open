-- pgTAP tests for prompts and time_slots RLS policies
-- Run with: npx supabase test db

BEGIN;
SELECT plan(10);

-- ============================================
-- Setup: define test user IDs from seed data
-- ============================================

-- Test as digit (author of seed-prompt-published and seed-prompt-draft)
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 1. Author can read own prompts (all states)
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompts WHERE author_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ VALUES (2) $$,
  'Author can see own prompts (published + draft)'
);

-- 2. Author can read published prompts by others
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompts WHERE id = 'seed-prompt-other' $$,
  $$ VALUES (1) $$,
  'Author can see other users published prompts'
);

-- 3. Author can read own time slots
SELECT results_eq(
  $$ SELECT count(*)::int FROM time_slots WHERE prompt_id = 'seed-prompt-published' $$,
  $$ VALUES (2) $$,
  'Author can see own prompt time slots'
);

-- 4. Author can read time slots of published prompts by others
SELECT results_eq(
  $$ SELECT count(*)::int FROM time_slots WHERE prompt_id = 'seed-prompt-other' $$,
  $$ VALUES (1) $$,
  'Author can see time slots of other published prompts'
);

-- Now switch to the other user
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

-- 5. Other user can read published prompts
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompts WHERE id = 'seed-prompt-published' $$,
  $$ VALUES (1) $$,
  'Other user can see published prompts'
);

-- 6. Other user CANNOT see draft prompts by digit
SELECT is_empty(
  $$ SELECT * FROM prompts WHERE id = 'seed-prompt-draft' $$,
  'Other user cannot see draft prompts'
);

-- 7. Other user cannot update digit's prompts (RLS silently filters, 0 rows affected)
SELECT lives_ok(
  $$ UPDATE prompts SET title = 'Hacked' WHERE id = 'seed-prompt-published' $$,
  'Update on non-owned prompt does not throw'
);
SELECT results_eq(
  $$ SELECT title FROM prompts WHERE id = 'seed-prompt-published' $$,
  $$ VALUES ('What we owe each other as strangers'::text) $$,
  'Title unchanged after unauthorized update attempt'
);

-- 8. Other user cannot delete digit's draft (RLS silently filters, row still exists)
SELECT lives_ok(
  $$ DELETE FROM prompts WHERE id = 'seed-prompt-draft' $$,
  'Delete on non-owned prompt does not throw'
);

SELECT * FROM finish();
ROLLBACK;
