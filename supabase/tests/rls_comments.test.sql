-- pgTAP tests for prompt_comments RLS policies
-- Two-party visibility: commenter sees own, prompt author sees all, others see nothing

BEGIN;
SELECT plan(6);

-- ============================================
-- Test as otherperson (commenter on digit's prompt, AND author of seed-prompt-other)
-- ============================================
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

-- 1. Commenter can see their own comment on digit's prompt
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompt_comments
     WHERE prompt_id = 'seed-prompt-published'
     AND author_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ VALUES (1) $$,
  'Commenter can see their own comment'
);

-- 2. As prompt author, can see ALL comments on own prompt (seed-prompt-other)
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompt_comments
     WHERE prompt_id = 'seed-prompt-other' $$,
  $$ VALUES (1) $$,
  'Prompt author sees all comments on their prompt'
);

-- ============================================
-- Test as digit (author of seed-prompt-published)
-- ============================================
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- 3. Prompt author sees comments on their prompt from other users
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompt_comments
     WHERE prompt_id = 'seed-prompt-published'
     AND author_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ VALUES (1) $$,
  'Prompt author can see other users comments on their prompt'
);

-- 4. User can see their own comment on someone else's prompt
SELECT results_eq(
  $$ SELECT count(*)::int FROM prompt_comments
     WHERE prompt_id = 'seed-prompt-other'
     AND author_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ VALUES (1) $$,
  'User can see their own comment on others prompt'
);

-- 5. One comment per user per prompt (UNIQUE constraint)
SELECT throws_ok(
  $$ INSERT INTO prompt_comments (prompt_id, author_id, body)
     VALUES ('seed-prompt-other', '11111111-1111-1111-1111-111111111111', 'Duplicate') $$,
  '23505',
  NULL,
  'Cannot insert duplicate comment for same user and prompt'
);

-- 6. Comment body length enforced (max 2000)
SELECT throws_ok(
  $$ INSERT INTO prompt_comments (prompt_id, author_id, body)
     VALUES ('seed-prompt-published', '11111111-1111-1111-1111-111111111111',
             repeat('x', 2001)) $$,
  NULL,
  NULL,
  'Oversized comment body rejected'
);

SELECT * FROM finish();
ROLLBACK;
