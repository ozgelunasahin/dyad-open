-- Seed data for local development and E2E testing.
-- Run with: npx supabase db reset
--
-- Test users:
--   lisa@test.invalid / password123       (UUID: 11111111-...) — admin, prompt author
--   marco@test.invalid / password123      (UUID: 22222222-...) — second user
--   sophie@test.invalid / dyad2026!      (UUID: 33333333-...) — Playwright tester (FREE, no gate)
--   tom@test.invalid / dyad2026!         (UUID: 44444444-...) — Playwright tester (FREE, no gate)
--   ava@test.invalid / password123        (UUID: 55555555-...) — feedback-gated user (has due form)
--   ben@test.invalid / password123        (UUID: 66666666-...) — feedback-gated user (has due form)
--   nina@test.invalid / password123       (UUID: 77777777-...) — meeting lifecycle scenarios
--   kai@test.invalid / password123        (UUID: 88888888-...) — meeting lifecycle scenarios
--
-- Sophie and Tom are FREE to test all flows (browse, respond, invite, accept).
-- Ava and Ben are GATED — they have a past meeting with due feedback forms.
-- Nina and Kai have meetings in various lifecycle states.

-- ============================================
-- AUTH USERS (8 users)
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
  VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lisa@test.invalid', v_pw_dev, v_now, v_now, '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb, '{"username":"lisa"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'email', jsonb_build_object('sub','11111111-1111-1111-1111-111111111111','email','lisa@test.invalid'), v_now, v_now, v_now);

  -- marco
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marco@test.invalid', v_pw_dev, v_now, v_now, v_meta_email, '{"username":"marco"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'email', jsonb_build_object('sub','22222222-2222-2222-2222-222222222222','email','marco@test.invalid'), v_now, v_now, v_now);

  -- sophie (Playwright — FREE, no gate)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sophie@test.invalid', v_pw_test, v_now, v_now, v_meta_email, '{"username":"sophie"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'email', jsonb_build_object('sub','33333333-3333-3333-3333-333333333333','email','sophie@test.invalid'), v_now, v_now, v_now);

  -- tom (Playwright — FREE, no gate)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tom@test.invalid', v_pw_test, v_now, v_now, v_meta_email, '{"username":"tom"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'email', jsonb_build_object('sub','44444444-4444-4444-4444-444444444444','email','tom@test.invalid'), v_now, v_now, v_now);

  -- ava (feedback-gated)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ava@test.invalid', v_pw_dev, v_now, v_now, v_meta_email, '{"username":"ava"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'email', jsonb_build_object('sub','55555555-5555-5555-5555-555555555555','email','ava@test.invalid'), v_now, v_now, v_now);

  -- ben (feedback-gated)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ben@test.invalid', v_pw_dev, v_now, v_now, v_meta_email, '{"username":"ben"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'email', jsonb_build_object('sub','66666666-6666-6666-6666-666666666666','email','ben@test.invalid'), v_now, v_now, v_now);

  -- nina (meeting lifecycle scenarios)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nina@test.invalid', v_pw_dev, v_now, v_now, v_meta_email, '{"username":"nina"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', 'email', jsonb_build_object('sub','77777777-7777-7777-7777-777777777777','email','nina@test.invalid'), v_now, v_now, v_now);

  -- kai (meeting lifecycle scenarios)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kai@test.invalid', v_pw_dev, v_now, v_now, v_meta_email, '{"username":"kai"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', 'email', jsonb_build_object('sub','88888888-8888-8888-8888-888888888888','email','kai@test.invalid'), v_now, v_now, v_now);
END $$;

-- ============================================
-- PROFILES
-- ============================================

-- ON CONFLICT because handle_new_user trigger creates profile rows automatically
INSERT INTO profiles (id, username, onboarded, can_publish_sites) VALUES
  ('11111111-1111-1111-1111-111111111111', 'lisa', true, true),
  ('22222222-2222-2222-2222-222222222222', 'marco', true, false),
  ('33333333-3333-3333-3333-333333333333', 'sophie', true, false),
  ('44444444-4444-4444-4444-444444444444', 'tom', true, false),
  ('55555555-5555-5555-5555-555555555555', 'ava', true, false),
  ('66666666-6666-6666-6666-666666666666', 'ben', true, false),
  ('77777777-7777-7777-7777-777777777777', 'nina', true, false),
  ('88888888-8888-8888-8888-888888888888', 'kai', true, false)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  onboarded = EXCLUDED.onboarded,
  can_publish_sites = EXCLUDED.can_publish_sites;

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
-- NEW PROMPTS for meeting lifecycle scenarios
-- ============================================

-- 7. Nina's prompt — SCHEDULED meeting (future, accepted invitation)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-scheduled', '77777777-7777-7777-7777-777777777777',
   'On walking without a destination',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"What happens when you walk without knowing where you are going? The city reveals itself differently when there is no goal."}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-walking/800/400',
   'published', 'berlin', NOW() - interval '4 days', NOW() - interval '5 days', NOW() - interval '2 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng, accepted) VALUES
  ('a0000006-0000-0000-0000-000000000001', 'seed-prompt-scheduled', NOW() + interval '1 day', 75,
   '{"place_id":"8","name":"Görlitzer Park","address":"Görlitzer Str., 10997 Berlin","lat":52.4966,"lng":13.4370}'::jsonb,
   'Kreuzberg', 52.4966, 13.4370, true),
  -- Second unaccepted slot prevents archive_stale_prompts from archiving this prompt
  ('a0000006-0000-0000-0000-000000000002', 'seed-prompt-scheduled', NOW() + interval '3 days', 60,
   '{"place_id":"9","name":"Tempelhofer Feld","address":"Tempelhofer Damm, 12101 Berlin","lat":52.4735,"lng":13.4016}'::jsonb,
   'Tempelhof', 52.4735, 13.4016, false);

-- 8. Nina's prompt — CANCELLED EARLY (>12h before, kai cancelled)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-cancelled-early', '77777777-7777-7777-7777-777777777777',
   'The courage it takes to be boring',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Everyone wants to be interesting. But what if the real courage is in being ordinary, predictable, even boring?"}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-boring/800/400',
   'published', 'berlin', NOW() - interval '10 days', NOW() - interval '11 days', NOW() - interval '5 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng, accepted) VALUES
  ('a0000007-0000-0000-0000-000000000001', 'seed-prompt-cancelled-early', NOW() - interval '3 days', 60,
   '{"place_id":"9","name":"Café Ernst","address":"Ohlauer Str. 38, 10999 Berlin","lat":52.4928,"lng":13.4340}'::jsonb,
   'Kreuzberg', 52.4928, 13.4340, true);

-- 9. Lisa's prompt — CANCELLED LATE (<12h before, marco cancelled)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-cancelled-late', '11111111-1111-1111-1111-111111111111',
   'Why we avoid eye contact on the U-Bahn',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"In Berlin, the unwritten rule is to look nowhere. On the U-Bahn, we sit inches apart and pretend we are alone. What are we protecting?"}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-ubahn/800/400',
   'published', 'berlin', NOW() - interval '6 days', NOW() - interval '7 days', NOW() - interval '2 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng, accepted) VALUES
  ('a0000008-0000-0000-0000-000000000001', 'seed-prompt-cancelled-late', NOW() - interval '1 day', 60,
   '{"place_id":"10","name":"Klunkerkranich","address":"Karl-Marx-Straße 66, 12043 Berlin","lat":52.4810,"lng":13.4413}'::jsonb,
   'Neukölln', 52.4810, 13.4413, true);

-- 10. Kai's prompt — ONE-SIDE FEEDBACK (meeting happened, kai submitted, marco hasn't)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-one-feedback', '88888888-8888-8888-8888-888888888888',
   'When did you last change your mind about something important?',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"We rarely trace the moment a belief shifts. One day we simply notice we think differently. What changed?"}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-change/800/400',
   'published', 'berlin', NOW() - interval '8 days', NOW() - interval '9 days', NOW() - interval '3 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng, accepted) VALUES
  ('a0000009-0000-0000-0000-000000000001', 'seed-prompt-one-feedback', NOW() - interval '2 days', 60,
   '{"place_id":"11","name":"Holzmarkt 25","address":"Holzmarktstraße 25, 10243 Berlin","lat":52.5100,"lng":13.4250}'::jsonb,
   'Friedrichshain', 52.5100, 13.4250, true);

-- 11. Marco's prompt — COMPLETED (both feedback submitted, locked)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-completed', '22222222-2222-2222-2222-222222222222',
   'The last meal you would cook for a stranger',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"If you had to cook one meal for someone you had never met, what would it be? What does that choice say about you?"}]}]}'::jsonb,
   'https://picsum.photos/seed/dyad-meal/800/400',
   'published', 'berlin', NOW() - interval '12 days', NOW() - interval '13 days', NOW() - interval '7 days');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng, accepted) VALUES
  ('a0000010-0000-0000-0000-000000000001', 'seed-prompt-completed', NOW() - interval '5 days', 90,
   '{"place_id":"12","name":"Café Botanico","address":"Richardstraße 100, 12043 Berlin","lat":52.4780,"lng":13.4430}'::jsonb,
   'Neukölln', 52.4780, 13.4430, true);

-- ============================================
-- COMMENTS
-- ============================================

INSERT INTO prompt_comments (prompt_id, author_id, body) VALUES
  -- Existing
  ('seed-prompt-published', '22222222-2222-2222-2222-222222222222',
   'This resonates deeply. I have been thinking about strangers and obligation lately.'),
  ('seed-prompt-marco', '11111111-1111-1111-1111-111111111111',
   'Would love to explore this topic together.'),
  ('seed-prompt-ava', '66666666-6666-6666-6666-666666666666',
   'I struggle with this too. Listening requires letting go of your own agenda.'),
  -- New: for meeting lifecycle prompts
  ('seed-prompt-scheduled', '88888888-8888-8888-8888-888888888888',
   'I walk through Kreuzberg without a map most weekends. Would love to share that.'),
  ('seed-prompt-cancelled-early', '88888888-8888-8888-8888-888888888888',
   'Boring is underrated. I have been trying to embrace the ordinary lately.'),
  ('seed-prompt-cancelled-late', '22222222-2222-2222-2222-222222222222',
   'Eye contact on the U-Bahn feels transgressive. I am curious about this.'),
  ('seed-prompt-one-feedback', '22222222-2222-2222-2222-222222222222',
   'I changed my mind about ambition last year. It was gradual, then sudden.'),
  ('seed-prompt-completed', '77777777-7777-7777-7777-777777777777',
   'I would cook dal. Simple, nourishing, and it says: I want you to feel at home.');

-- ============================================
-- INVITATIONS
-- ============================================

-- lisa → marco: pending invitation (existing)
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'seed-prompt-marco', 'a0000003-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-marco' AND author_id = '11111111-1111-1111-1111-111111111111'),
   'Free that afternoon — would be great to meet at Markthalle Neun.', 'pending');

-- ben → ava: accepted invitation, past meeting (existing — feedback gate)
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('b0000002-0000-0000-0000-000000000001', 'seed-prompt-ava', 'a0000005-0000-0000-0000-000000000001',
   '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-ava' AND author_id = '66666666-6666-6666-6666-666666666666'),
   'Would love to meet for this conversation.', 'accepted', NOW() - interval '2 days');

-- kai → nina: accepted, SCHEDULED meeting (future)
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('b0000003-0000-0000-0000-000000000001', 'seed-prompt-scheduled', 'a0000006-0000-0000-0000-000000000001',
   '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-scheduled' AND author_id = '88888888-8888-8888-8888-888888888888'),
   'Looking forward to this walk.', 'accepted', NOW() - interval '1 day');

-- kai → nina: accepted, then CANCELLED EARLY
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('b0000004-0000-0000-0000-000000000001', 'seed-prompt-cancelled-early', 'a0000007-0000-0000-0000-000000000001',
   '88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-cancelled-early' AND author_id = '88888888-8888-8888-8888-888888888888'),
   'Count me in for this one.', 'accepted', NOW() - interval '5 days');

-- marco → lisa: accepted, then CANCELLED LATE
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('b0000005-0000-0000-0000-000000000001', 'seed-prompt-cancelled-late', 'a0000008-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-cancelled-late' AND author_id = '22222222-2222-2222-2222-222222222222'),
   'Great topic — see you at Klunkerkranich.', 'accepted', NOW() - interval '3 days');

-- marco → kai: accepted, ONE-SIDE FEEDBACK
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('b0000006-0000-0000-0000-000000000001', 'seed-prompt-one-feedback', 'a0000009-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-one-feedback' AND author_id = '22222222-2222-2222-2222-222222222222'),
   'This sounds like exactly the conversation I need right now.', 'accepted', NOW() - interval '3 days');

-- nina → marco: accepted, COMPLETED
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('b0000007-0000-0000-0000-000000000001', 'seed-prompt-completed', 'a0000010-0000-0000-0000-000000000001',
   '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-completed' AND author_id = '77777777-7777-7777-7777-777777777777'),
   'Dal — perfect answer. I will bring dessert.', 'accepted', NOW() - interval '6 days');

-- ============================================
-- MEETINGS
-- ============================================

-- Ava + Ben: awaiting_feedback (existing — feedback gate)
INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001', 'seed-prompt-ava',
   '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666',
   'a0000005-0000-0000-0000-000000000001', NOW() - interval '1 day', 60, 'awaiting_feedback');

-- Nina + Kai: SCHEDULED (future meeting, tomorrow)
INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000001', 'seed-prompt-scheduled',
   '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888',
   'a0000006-0000-0000-0000-000000000001', NOW() + interval '1 day', 75, 'scheduled');

-- Nina + Kai: CANCELLED EARLY (>12h before)
INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state, resolved_at) VALUES
  ('c0000003-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000001', 'seed-prompt-cancelled-early',
   '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888',
   'a0000007-0000-0000-0000-000000000001', NOW() - interval '3 days', 60, 'cancelled_early', NOW() - interval '4 days');

-- Lisa + Marco: CANCELLED LATE (<12h before)
INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state, resolved_at) VALUES
  ('c0000004-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000001', 'seed-prompt-cancelled-late',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'a0000008-0000-0000-0000-000000000001', NOW() - interval '1 day', 60, 'cancelled_late', NOW() - interval '1 day' + interval '2 hours');

-- Kai + Marco: AWAITING_FEEDBACK (one side submitted)
INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state) VALUES
  ('c0000005-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000001', 'seed-prompt-one-feedback',
   '88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222',
   'a0000009-0000-0000-0000-000000000001', NOW() - interval '2 days', 60, 'awaiting_feedback');

-- Marco + Nina: COMPLETED (both feedback submitted and locked)
INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state, resolved_at) VALUES
  ('c0000006-0000-0000-0000-000000000001', 'b0000007-0000-0000-0000-000000000001', 'seed-prompt-completed',
   '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777',
   'a0000010-0000-0000-0000-000000000001', NOW() - interval '5 days', 90, 'completed', NOW() - interval '4 days');

-- ============================================
-- CANCELLATION RECORDS
-- ============================================

-- Cancelled early: kai cancelled >12h before
INSERT INTO cancellation_records (meeting_id, cancelled_by, cancelled_at, tier, reason) VALUES
  ('c0000003-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888',
   NOW() - interval '4 days', 'early', 'Something came up with work and I cannot make it. Sorry about this.');

-- Cancelled late: marco cancelled <12h before
INSERT INTO cancellation_records (meeting_id, cancelled_by, cancelled_at, tier, reason) VALUES
  ('c0000004-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   NOW() - interval '1 day' + interval '2 hours', 'late', NULL);

-- ============================================
-- FEEDBACK FORMS
-- ============================================

-- Ava + Ben: both due (feedback gate active)
INSERT INTO feedback_forms (id, meeting_id, reviewer_id, reviewee_id, state) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001',
   '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', 'due'),
  ('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001',
   '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'due');

-- Kai + Marco: kai submitted, marco still due (one-side feedback)
-- free_text is platform-private; share_with_person is what Marco sees in revealed feedback
INSERT INTO feedback_forms (id, meeting_id, reviewer_id, reviewee_id, state, did_meet, rating_tags, free_text, share_with_person, submitted_at) VALUES
  ('d0000002-0000-0000-0000-000000000001', 'c0000005-0000-0000-0000-000000000001',
   '88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222',
   'submitted', true, ARRAY['thoughtful', 'curious', 'articulate'],
   'Marco was genuinely engaged. We talked for longer than planned.',
   'Thanks for going deep on the question rather than skating over it. I left thinking.',
   NOW() - interval '1 day');
INSERT INTO feedback_forms (id, meeting_id, reviewer_id, reviewee_id, state) VALUES
  ('d0000002-0000-0000-0000-000000000002', 'c0000005-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 'due');

-- Marco + Nina: both submitted → locked (completed meeting)
-- free_text is platform-private; share_with_person is what the other user sees in revealed feedback
INSERT INTO feedback_forms (id, meeting_id, reviewer_id, reviewee_id, state, did_meet, rating_tags, free_text, share_with_person, submitted_at, locked_at) VALUES
  ('d0000003-0000-0000-0000-000000000001', 'c0000006-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777',
   'locked', true, ARRAY['warm', 'open-minded', 'genuine'],
   'Nina brought such a thoughtful energy. The dal conversation was wonderful.',
   'Thank you for the conversation about food and home. It stayed with me all evening.',
   NOW() - interval '4 days', NOW() - interval '3 days' + interval '6 hours'),
  ('d0000003-0000-0000-0000-000000000002', 'c0000006-0000-0000-0000-000000000001',
   '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222',
   'locked', true, ARRAY['engaging', 'curious', 'kind'],
   'Marco is a wonderful listener. I felt truly heard.',
   'I appreciated how you really took time to think before answering. Rare quality.',
   NOW() - interval '3 days' + interval '6 hours', NOW() - interval '3 days' + interval '6 hours');

-- ============================================
-- ADJECTIVE VOCABULARY
-- ============================================

-- Vocabulary already seeded in migration 20260401. Add any extras here.
INSERT INTO adjective_vocabulary (word) VALUES
  ('engaged'), ('open'), ('reserved'), ('quiet'),
  ('intense'), ('distracted'), ('dismissive'), ('late')
ON CONFLICT (word) DO NOTHING;
