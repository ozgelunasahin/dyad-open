-- Seed data for local development and E2E testing.
-- Run with: npx supabase db reset
--
-- Test users:
--   digit@test.local / password123     (UUID: 11111111-...) — admin, prompt author
--   other@test.local / password123     (UUID: 22222222-...) — second user
--   sophie@dyad.berlin / dyad2026!     (UUID: 33333333-...) — Playwright tester
--   tom@dyad.berlin / dyad2026!        (UUID: 44444444-...) — Playwright tester
--
-- Lifecycle states seeded:
--   Prompts: draft, published (future slots), published (one slot booked), archived
--   Invitations: pending, accepted
--   Meetings: awaiting_feedback (past, forms due)
--   Feedback: due (gate active for sophie + tom)

-- ============================================
-- AUTH USERS (4 users)
-- ============================================

DO $$
DECLARE
  v_encrypted_pw_dev TEXT := crypt('password123', gen_salt('bf'));
  v_encrypted_pw_test TEXT := crypt('dyad2026!', gen_salt('bf'));
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- digit (admin)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'digit@test.local', v_encrypted_pw_dev, v_now, v_now, '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'email', jsonb_build_object('sub','11111111-1111-1111-1111-111111111111','email','digit@test.local'), v_now, v_now, v_now);

  -- otherperson
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@test.local', v_encrypted_pw_dev, v_now, v_now, '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'email', jsonb_build_object('sub','22222222-2222-2222-2222-222222222222','email','other@test.local'), v_now, v_now, v_now);

  -- sophie (Playwright)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sophie@dyad.berlin', v_encrypted_pw_test, v_now, v_now, '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"sophie"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'email', jsonb_build_object('sub','33333333-3333-3333-3333-333333333333','email','sophie@dyad.berlin'), v_now, v_now, v_now);

  -- tom (Playwright)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, email_change_token_current, recovery_token)
  VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tom@dyad.berlin', v_encrypted_pw_test, v_now, v_now, '{"provider":"email","providers":["email"]}'::jsonb, '{"username":"tom"}'::jsonb, v_now, v_now, '', '', '', '', '');
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'email', jsonb_build_object('sub','44444444-4444-4444-4444-444444444444','email','tom@dyad.berlin'), v_now, v_now, v_now);
END $$;

-- ============================================
-- PROFILES
-- ============================================

INSERT INTO profiles (id, username, onboarded, can_publish_sites) VALUES
  ('11111111-1111-1111-1111-111111111111', 'digit', true, true),
  ('22222222-2222-2222-2222-222222222222', 'otherperson', true, false),
  ('33333333-3333-3333-3333-333333333333', 'sophie', true, false),
  ('44444444-4444-4444-4444-444444444444', 'tom', true, false);

-- ============================================
-- CANVASES (legacy — needed for landing page)
-- ============================================

INSERT INTO canvases (id, user_id, name, slug, is_published) VALUES
  ('seed-canvas-landing', '11111111-1111-1111-1111-111111111111', 'dyad', 'dyad', true);

-- ============================================
-- PROMPTS — all lifecycle states
-- ============================================

-- 1. Published prompt with future slots (digit's) — browse + respond + invite
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-published', '11111111-1111-1111-1111-111111111111',
   'What we owe each other as strangers',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The stranger is a peculiar figure — neither friend nor enemy, neither known nor entirely unknown. What is the minimum we owe someone we will never see again?"}]}]}'::jsonb,
   'http://127.0.0.1:54321/storage/v1/object/public/uploads/seed/test-cover.png',
   'published', 'berlin', NOW(), NOW() - interval '1 day', NOW());

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('slot-published-1', 'seed-prompt-published', NOW() + interval '2 days', 90,
   '{"place_id":"1","name":"Café am Neuen See","address":"Lichtensteinallee 2, 10787 Berlin","lat":52.5095,"lng":13.3405}'::jsonb,
   'Tiergarten', 52.5145, 13.3501),
  ('slot-published-2', 'seed-prompt-published', NOW() + interval '4 days', 60,
   '{"place_id":"2","name":"Tempelhofer Feld","address":"Tempelhofer Damm, 12101 Berlin","lat":52.4731,"lng":13.4015}'::jsonb,
   'Tempelhof', 52.4731, 13.4015);

-- 2. Draft prompt (digit's)
INSERT INTO prompts (id, author_id, title, body, state, region, created_at, updated_at) VALUES
  ('seed-prompt-draft', '11111111-1111-1111-1111-111111111111',
   'On the pleasure of changing your mind',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"We treat consistency as a virtue and revision as weakness."}]}]}'::jsonb,
   'draft', 'berlin', NOW(), NOW());

-- 3. Archived prompt (digit's)
INSERT INTO prompts (id, author_id, title, body, state, region, published_at, archived_at, created_at, updated_at) VALUES
  ('seed-prompt-archived', '11111111-1111-1111-1111-111111111111',
   'On being a beginner again',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"There is a particular humility required to be a beginner."}]}]}'::jsonb,
   'archived', 'berlin', NOW() - interval '7 days', NOW() - interval '1 day', NOW() - interval '8 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('slot-archived-1', 'seed-prompt-archived', NOW() - interval '2 days', 60,
   '{"place_id":"4","name":"Betahaus","address":"Rudi-Dutschke-Straße 23, 10969 Berlin","lat":52.5069,"lng":13.3918}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- 4. Published prompt by otherperson — RLS testing + pending invitation
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-other', '22222222-2222-2222-2222-222222222222',
   'Language and what slips through it',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Every language carves the world differently."}]}]}'::jsonb,
   'http://127.0.0.1:54321/storage/v1/object/public/uploads/seed/test-cover.png',
   'published', 'berlin', NOW(), NOW() - interval '2 days', NOW());

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('slot-other-1', 'seed-prompt-other', NOW() + interval '3 days', 60,
   '{"place_id":"3","name":"Markthalle Neun","address":"Eisenbahnstraße 42/43, 10999 Berlin","lat":52.5006,"lng":13.4284}'::jsonb,
   'Kreuzberg', 52.4988, 13.4238);

-- 5. Sophie's prompt — has a PAST slot (meeting happened) + FUTURE slot (still available)
INSERT INTO prompts (id, author_id, title, body, cover_image_url, state, region, published_at, created_at, updated_at) VALUES
  ('seed-prompt-sophie', '33333333-3333-3333-3333-333333333333',
   'The shape of comfortable silence',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"There is a particular quality of silence between two people who are comfortable together. How do we get there with someone new?"}]}]}'::jsonb,
   'http://127.0.0.1:54321/storage/v1/object/public/uploads/seed/test-cover.png',
   'published', 'berlin', NOW() - interval '5 days', NOW() - interval '6 days', NOW() - interval '1 day');

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng, accepted) VALUES
  ('slot-sophie-past', 'seed-prompt-sophie', NOW() - interval '1 day', 60,
   '{"place_id":"5","name":"Volkspark Friedrichshain","address":"Am Friedrichshain, 10249 Berlin","lat":52.5283,"lng":13.4372}'::jsonb,
   'Friedrichshain', 52.5283, 13.4372, true);

INSERT INTO time_slots (id, prompt_id, start_time, duration_minutes, exact_location, general_area, general_area_lat, general_area_lng) VALUES
  ('slot-sophie-future', 'seed-prompt-sophie', NOW() + interval '5 days', 60,
   '{"place_id":"6","name":"Café Blume","address":"Schönhauser Allee 6, 10119 Berlin","lat":52.5310,"lng":13.4112}'::jsonb,
   'Prenzlauer Berg', 52.5310, 13.4112);

-- ============================================
-- COMMENTS
-- ============================================

INSERT INTO prompt_comments (prompt_id, author_id, body) VALUES
  ('seed-prompt-published', '22222222-2222-2222-2222-222222222222',
   'This resonates deeply. I have been thinking about strangers and obligation lately.'),
  ('seed-prompt-other', '11111111-1111-1111-1111-111111111111',
   'Would love to explore this topic together.'),
  ('seed-prompt-sophie', '44444444-4444-4444-4444-444444444444',
   'I think about this often. The silence on the U-Bahn is so different from the silence in a forest.');

-- ============================================
-- INVITATIONS — pending + accepted
-- ============================================

-- digit → otherperson: pending invitation
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state) VALUES
  ('inv-digit-pending', 'seed-prompt-other', 'slot-other-1',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-other' AND author_id = '11111111-1111-1111-1111-111111111111'),
   'Free that afternoon — would be great to meet at Markthalle Neun.', 'pending');

-- tom → sophie: accepted invitation (meeting created below)
INSERT INTO prompt_invitations (id, prompt_id, slot_id, inviter_id, invitee_id, comment_id, message, state, resolved_at) VALUES
  ('inv-tom-accepted', 'seed-prompt-sophie', 'slot-sophie-past',
   '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
   (SELECT id FROM prompt_comments WHERE prompt_id = 'seed-prompt-sophie' AND author_id = '44444444-4444-4444-4444-444444444444'),
   'Would love to meet for this conversation.', 'accepted', NOW() - interval '2 days');

-- ============================================
-- MEETING — awaiting_feedback (happened yesterday)
-- ============================================

INSERT INTO meetings (id, invitation_id, prompt_id, participant_a, participant_b, slot_id, scheduled_time, duration_minutes, state) VALUES
  ('meeting-sophie-tom', 'inv-tom-accepted', 'seed-prompt-sophie',
   '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
   'slot-sophie-past', NOW() - interval '1 day', 60, 'awaiting_feedback');

-- ============================================
-- FEEDBACK FORMS — due (gate active for both sophie + tom)
-- ============================================

INSERT INTO feedback_forms (id, meeting_id, reviewer_id, reviewee_id, state) VALUES
  ('feedback-sophie-reviews-tom', 'meeting-sophie-tom',
   '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'due'),
  ('feedback-tom-reviews-sophie', 'meeting-sophie-tom',
   '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'due');

-- ============================================
-- ADJECTIVE VOCABULARY (for feedback tags)
-- ============================================

INSERT INTO adjective_vocabulary (word, category) VALUES
  ('thoughtful', 'positive'), ('warm', 'positive'), ('curious', 'positive'),
  ('engaged', 'positive'), ('open', 'positive'), ('kind', 'positive'),
  ('genuine', 'positive'), ('reserved', 'neutral'), ('quiet', 'neutral'),
  ('intense', 'neutral'), ('distracted', 'negative'), ('dismissive', 'negative'),
  ('late', 'negative')
ON CONFLICT (word) DO NOTHING;
