-- Seed data for local development
-- Run with: npx supabase db reset
--
-- Test users:
--   digit@test.local / local-fixture-not-a-secret   (UUID: 11111111-...)
--   other@test.local / local-fixture-not-a-secret   (UUID: 22222222-...)

-- ============================================
-- AUTH USERS
-- ============================================

-- Primary test user: digit (admin, prompt author)
DO $$
DECLARE
  v_user_id UUID := '11111111-1111-1111-1111-111111111111';
  v_encrypted_pw TEXT := crypt('local-fixture-not-a-secret', gen_salt('bf'));
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new,
    email_change_token_current, recovery_token
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'digit@test.local', v_encrypted_pw,
    v_now, v_now,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    v_now, v_now,
    '', '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id, v_user_id::text, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', 'digit@test.local'),
    v_now, v_now, v_now
  );
END $$;

-- Secondary test user: otherperson
DO $$
DECLARE
  v_user_id UUID := '22222222-2222-2222-2222-222222222222';
  v_encrypted_pw TEXT := crypt('local-fixture-not-a-secret', gen_salt('bf'));
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new,
    email_change_token_current, recovery_token
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'other@test.local', v_encrypted_pw,
    v_now, v_now,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    v_now, v_now,
    '', '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id, v_user_id::text, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', 'other@test.local'),
    v_now, v_now, v_now
  );
END $$;

-- ============================================
-- PROFILES
-- ============================================

INSERT INTO profiles (id, username, onboarded) VALUES
  ('11111111-1111-1111-1111-111111111111', 'digit', true),
  ('22222222-2222-2222-2222-222222222222', 'otherperson', true);

-- ============================================
-- CANVASES (for landing page compatibility)
-- ============================================

INSERT INTO canvases (id, user_id, name, slug, is_published) VALUES
  ('seed-canvas-landing', '11111111-1111-1111-1111-111111111111', 'dyad', 'dyad', true);

-- ============================================
-- PROMPTS (new domain model)
-- ============================================

-- A published prompt with time slots (digit's)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-published', '11111111-1111-1111-1111-111111111111',
   'What we owe each other as strangers',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The stranger is a peculiar figure — neither friend nor enemy, neither known nor entirely unknown. What is the minimum we owe someone we will never see again?"}]}]}'::jsonb,
   'http://127.0.0.1:54321/storage/v1/object/public/uploads/seed/test-cover.png', 'published', 'berlin',
   NOW(), NOW() - interval '1 day', NOW());

-- Time slots for the published prompt (future dates)
INSERT INTO time_slots (prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('seed-prompt-published', NOW() + interval '2 days', 90,
   '{"place_id":"1","name":"Café am Neuen See","address":"Lichtensteinallee 2, 10787 Berlin","lat":52.5095,"lng":13.3405}'::jsonb,
   'Tiergarten', 52.5145, 13.3501),
  ('seed-prompt-published', NOW() + interval '4 days', 60,
   '{"place_id":"2","name":"Tempelhofer Feld","address":"Tempelhofer Damm, 12101 Berlin","lat":52.4731,"lng":13.4015}'::jsonb,
   'Tempelhof', 52.4731, 13.4015);

-- A draft prompt (digit's, for testing state transitions)
INSERT INTO prompts (id, author_id, title, body, state, region, created_at, updated_at) VALUES
  ('seed-prompt-draft', '11111111-1111-1111-1111-111111111111',
   'On the pleasure of changing your mind',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"We treat consistency as a virtue and revision as weakness."}]}]}'::jsonb,
   'draft', 'berlin',
   NOW(), NOW());

-- An archived prompt (digit's, for testing archived display)
INSERT INTO prompts (id, author_id, title, body, state, region, published_at, archived_at, created_at, updated_at) VALUES
  ('seed-prompt-archived', '11111111-1111-1111-1111-111111111111',
   'On being a beginner again',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"There is a particular humility required to be a beginner. Most of us spend our adult lives avoiding it."}]}]}'::jsonb,
   'archived', 'berlin',
   NOW() - interval '7 days', NOW() - interval '1 day',
   NOW() - interval '8 days', NOW() - interval '1 day');

-- Expired slots for the archived prompt (in the past)
INSERT INTO time_slots (prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('seed-prompt-archived', NOW() - interval '2 days', 60,
   '{"place_id":"4","name":"Betahaus","address":"Rudi-Dutschke-Straße 23, 10969 Berlin","lat":52.5069,"lng":13.3918}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- A published prompt by the other user (for RLS testing)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-other', '22222222-2222-2222-2222-222222222222',
   'Language and what slips through it',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Every language carves the world differently."}]}]}'::jsonb,
   'http://127.0.0.1:54321/storage/v1/object/public/uploads/seed/test-cover.png', 'published', 'berlin',
   NOW(), NOW() - interval '2 days', NOW());

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'seed-prompt-other', NOW() + interval '3 days', 60,
   '{"place_id":"3","name":"Markthalle Neun","address":"Eisenbahnstraße 42/43, 10999 Berlin","lat":52.5006,"lng":13.4284}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- ============================================
-- COMMENTS (engagement seed data)
-- ============================================

-- otherperson comments on digit's published prompt
INSERT INTO prompt_comments (prompt_id, author_id, body) VALUES
  ('seed-prompt-published', '22222222-2222-2222-2222-222222222222',
   'This resonates deeply. I have been thinking about strangers and obligation lately.');

-- ============================================
-- INVITATIONS (engagement seed data)
-- ============================================

-- digit comments on otherperson's prompt + invites for the slot
INSERT INTO prompt_comments (prompt_id, author_id, body) VALUES
  ('seed-prompt-other', '11111111-1111-1111-1111-111111111111',
   'Would love to explore this topic together.');

INSERT INTO prompt_invitations (prompt_id, slot_id, inviter_id, invitee_id, message) VALUES
  ('seed-prompt-other', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'Free that afternoon — would be great to meet at Markthalle Neun.');
