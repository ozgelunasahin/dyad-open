-- Seed data for local development and E2E testing.
-- Run with: npx supabase db reset
--
-- Test users:
--   lisa@test.local / password123       (UUID: 11111111-...) — admin, prompt author
--   marco@test.local / password123      (UUID: 22222222-...) — second user
--   sophie@dyad.berlin / dyad2026!      (UUID: 33333333-...) — Playwright tester (FREE, no gate)
--   tom@dyad.berlin / dyad2026!         (UUID: 44444444-...) — Playwright tester (FREE, no gate)
--   ava@test.local / password123        (UUID: 55555555-...) — feedback-gated user (has due form)
--   ben@test.local / password123        (UUID: 66666666-...) — feedback-gated user (has due form)
--
-- Sophie and Tom are FREE to test all flows (browse, respond, invite, accept).
-- Ava and Ben are GATED — they have a past meeting with due feedback forms.
-- This separation means Playwright tests can use sophie/tom for the core flow
-- and ava/ben for the feedback gate + submission + reveal flow.

-- ============================================
-- AUTH USERS (6 users)
-- ============================================

DO $$
DECLARE
  v_pw_dev TEXT := crypt('password123', gen_salt('bf'));
  v_pw_test TEXT := crypt('dyad2026!', gen_salt('bf'));
  v_now TIMESTAMPTZ := NOW();
  v_meta_email JSONB := '{"provider":"email","providers":["email"]}'::jsonb;
BEGIN
  -- lisa (admin — has role: admin in app_metadata)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lisa@test.local', v_pw_dev, v_now, v_now, '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb, '{}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'email', jsonb_build_object('sub','11111111-1111-1111-1111-111111111111','email','lisa@test.local'), v_now, v_now, v_now);

  -- marco
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marco@test.local', v_pw_dev, v_now, v_now, v_meta_email, '{}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'email', jsonb_build_object('sub','22222222-2222-2222-2222-222222222222','email','marco@test.local'), v_now, v_now, v_now);

  -- sophie (Playwright — FREE, no gate)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sophie@dyad.berlin', v_pw_test, v_now, v_now, v_meta_email, '{"username":"sophie"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'email', jsonb_build_object('sub','33333333-3333-3333-3333-333333333333','email','sophie@dyad.berlin'), v_now, v_now, v_now);

  -- tom (Playwright — FREE, no gate)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tom@dyad.berlin', v_pw_test, v_now, v_now, v_meta_email, '{"username":"tom"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'email', jsonb_build_object('sub','44444444-4444-4444-4444-444444444444','email','tom@dyad.berlin'), v_now, v_now, v_now);

  -- ava (feedback-gated)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ava@test.local', v_pw_dev, v_now, v_now, v_meta_email, '{"username":"ava"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'email', jsonb_build_object('sub','55555555-5555-5555-5555-555555555555','email','ava@test.local'), v_now, v_now, v_now);

  -- ben (feedback-gated)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ben@test.local', v_pw_dev, v_now, v_now, v_meta_email, '{"username":"ben"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'email', jsonb_build_object('sub','66666666-6666-6666-6666-666666666666','email','ben@test.local'), v_now, v_now, v_now);
END $$;

-- ============================================
-- PROFILES
-- ============================================

INSERT INTO profiles (id, username, onboarded, can_publish_sites) VALUES
  ('11111111-1111-1111-1111-111111111111', 'lisa', true, true),
  ('22222222-2222-2222-2222-222222222222', 'marco', true, false),
  ('33333333-3333-3333-3333-333333333333', 'sophie', true, false),
  ('44444444-4444-4444-4444-444444444444', 'tom', true, false),
  ('55555555-5555-5555-5555-555555555555', 'ava', true, false),
  ('66666666-6666-6666-6666-666666666666', 'ben', true, false);

-- ============================================
-- CANVASES (legacy — needed for landing page)
-- ============================================

INSERT INTO canvases (id, user_id, name, slug, is_published) VALUES
  ('seed-canvas-landing', '11111111-1111-1111-1111-111111111111', 'dyad', 'dyad', true);

-- ============================================
-- PROMPTS — all lifecycle states
-- ============================================

-- 1. Published prompt with future slots (lisa's) — browse + respond + invite
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-published', '11111111-1111-1111-1111-111111111111',
   'What we owe each other as strangers',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The stranger is a peculiar figure — neither friend nor enemy, neither known nor entirely unknown. What is the minimum we owe someone we will never see again?"}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-strangers/800/400',
   'published', 'berlin', NOW(), NOW() - interval '1 day', NOW());

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'seed-prompt-published', NOW() + interval '2 days', 90,
   '{"place_id":"1","name":"Café am Neuen See","address":"Lichtensteinallee 2, 10787 Berlin","lat":52.5095,"lng":13.3405}'::jsonb,
   'Tiergarten', 52.5145, 13.3501),
  ('a0000001-0000-0000-0000-000000000002', 'seed-prompt-published', NOW() + interval '4 days', 60,
   '{"place_id":"2","name":"Tempelhofer Feld","address":"Tempelhofer Damm, 12101 Berlin","lat":52.4731,"lng":13.4015}'::jsonb,
   'Tempelhof', 52.4731, 13.4015);

-- 2. Draft prompt (lisa's)
INSERT INTO prompts (id, author_id, title, body, state, region, created_at, updated_at) VALUES
  ('seed-prompt-draft', '11111111-1111-1111-1111-111111111111',
   'On the pleasure of changing your mind',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"We treat consistency as a virtue and revision as weakness."}]}]}'::jsonb,
   'draft', 'berlin', NOW(), NOW());

-- 3. Archived prompt (lisa's)
INSERT INTO prompts (id, author_id, title, body, state, region, published_at, archived_at, created_at, updated_at) VALUES
  ('seed-prompt-archived', '11111111-1111-1111-1111-111111111111',
   'On being a beginner again',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"There is a particular humility required to be a beginner."}]}]}'::jsonb,
   'archived', 'berlin', NOW() - interval '7 days', NOW() - interval '1 day', NOW() - interval '8 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('a0000002-0000-0000-0000-000000000001', 'seed-prompt-archived', NOW() - interval '2 days', 60,
   '{"place_id":"4","name":"Betahaus","address":"Rudi-Dutschke-Straße 23, 10969 Berlin","lat":52.5069,"lng":13.3918}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- 4. Published prompt by marco — RLS testing + pending invitation from lisa
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-marco', '22222222-2222-2222-2222-222222222222',
   'Language and what slips through it',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Every language carves the world differently."}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-language/800/400',
   'published', 'berlin', NOW(), NOW() - interval '2 days', NOW());

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('a0000003-0000-0000-0000-000000000001', 'seed-prompt-marco', NOW() + interval '3 days', 60,
   '{"place_id":"3","name":"Markthalle Neun","address":"Eisenbahnstraße 42/43, 10999 Berlin","lat":52.5006,"lng":13.4284}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- 5. Sophie's prompt — future slots, used for core E2E flow (respond → invite → accept)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-sophie', '33333333-3333-3333-3333-333333333333',
   'The shape of comfortable silence',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"There is a particular quality of silence between two people who are comfortable together. How do we get there with someone new?"}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-silence/800/400',
   'published', 'berlin', NOW() - interval '3 days', NOW() - interval '4 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('a0000004-0000-0000-0000-000000000001', 'seed-prompt-sophie', NOW() + interval '2 days', 60,
   '{"place_id":"5","name":"Volkspark Friedrichshain","address":"Am Friedrichshain, 10249 Berlin","lat":52.5283,"lng":13.4372}'::jsonb,
   'Friedrichshain', 52.5283, 13.4372),
  ('a0000004-0000-0000-0000-000000000002', 'seed-prompt-sophie', NOW() + interval '5 days', 60,
   '{"place_id":"6","name":"Café Blume","address":"Schönhauser Allee 6, 10119 Berlin","lat":52.5310,"lng":13.4112}'::jsonb,
   'Prenzlauer Berg', 52.5310, 13.4112);

-- 6. Ava's prompt — has a PAST slot with meeting (for feedback gate testing)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-ava', '55555555-5555-5555-5555-555555555555',
   'What does it mean to really listen?',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Most conversations are two people waiting for their turn to speak. Real listening is something else entirely."}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-listening/800/400',
   'published', 'berlin', NOW() - interval '5 days', NOW() - interval '6 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng, accepted) VALUES
  ('a0000005-0000-0000-0000-000000000001', 'seed-prompt-ava', NOW() - interval '1 day', 60,
   '{"place_id":"7","name":"Bonanza Coffee","address":"Oderberger Str. 35, 10435 Berlin","lat":52.5393,"lng":13.4112}'::jsonb,
   'Prenzlauer Berg', 52.5393, 13.4112, true);

-- ============================================
-- COMMENTS
-- ============================================

INSERT INTO prompt_comments (prompt_id, author_id, body) VALUES
  ('seed-prompt-published', '22222222-2222-2222-2222-222222222222',
   'This resonates deeply. I have been thinking about strangers and obligation lately.'),
  ('seed-prompt-marco', '11111111-1111-1111-1111-111111111111',
   'Would love to explore this topic together.'),
  ('seed-prompt-ava', '66666666-6666-6666-6666-666666666666',
   'I struggle with this too. Listening requires letting go of your own agenda.');

-- ============================================
-- INVITATIONS
-- ============================================

-- lisa → marco: pending invitation
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'seed-prompt-marco', 'a0000003-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-marco' AND author_id = '11111111-1111-1111-1111-111111111111'),
   'Free that afternoon — would be great to meet at Markthalle Neun.', 'pending');

-- ben → ava: accepted invitation (past meeting)
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('b0000002-0000-0000-0000-000000000001', 'seed-prompt-ava', 'a0000005-0000-0000-0000-000000000001',
   '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-ava' AND author_id = '66666666-6666-6666-6666-666666666666'),
   'Would love to meet for this conversation.', 'accepted', NOW() - interval '2 days');

-- ============================================
-- MEETING — ava + ben, awaiting_feedback (happened yesterday)
-- ============================================

INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001', 'seed-prompt-ava',
   '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666',
   'a0000005-0000-0000-0000-000000000001', NOW() - interval '1 day', 60, 'awaiting_feedback');

-- ============================================
-- FEEDBACK FORMS — due (gate active for ava + ben ONLY)
-- ============================================

INSERT INTO feedback_forms (id, meeting_id, reviewer_id, reviewee_id, state) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001',
   '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', 'due'),
  ('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001',
   '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'due');

-- ============================================
-- ADJECTIVE VOCABULARY
-- ============================================

-- Vocabulary already seeded in migration 20260401. Add any extras here.
INSERT INTO adjective_vocabulary (word) VALUES
  ('engaged'), ('open'), ('reserved'), ('quiet'),
  ('intense'), ('distracted'), ('dismissive'), ('late')
ON CONFLICT (word) DO NOTHING;
